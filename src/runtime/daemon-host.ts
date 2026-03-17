import { spawn } from "node:child_process";
import { openSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import net from "node:net";
import { fileURLToPath } from "node:url";
import { z } from "zod";

import { runtimeError } from "../core/errors.ts";
import { setBridgeConnectionState, setCachedTools } from "./daemon-state.ts";
import {
	resolveDaemonLogFilePath,
	resolveDaemonPidFilePath,
	resolveDaemonSocketPath,
	resolveStateRoot,
} from "./env.ts";
import { createXcodeBridgeClient } from "./xcode-client.ts";

type DaemonRequest =
	| {
		id: number;
		kind: "ping";
	}
	| {
		arguments: Record<string, unknown>;
		id: number;
		kind: "callTool";
		name: string;
	}
	| {
		id: number;
		kind: "stop";
	};

type DaemonResponse =
	| {
		id: number;
		ok: true;
		pid?: number;
		result?: unknown;
		running?: boolean;
		stopped?: boolean;
	}
	| {
		error: string;
		id: number;
		ok: false;
	};

export type DaemonStatus =
	| {
		running: false;
	}
	| {
		pid: number;
		running: true;
	};

const daemonEntryPath = fileURLToPath(new URL("./daemon-host-entry.ts", import.meta.url));
const DAEMON_PING_CONNECT_TIMEOUT_MS = 100;
const DAEMON_TOOL_CONNECT_TIMEOUT_MS = 500;
const daemonRequestSchema = z.discriminatedUnion("kind", [
	z.object({
		id: z.number().int(),
		kind: z.literal("ping"),
	}),
	z.object({
		id: z.number().int(),
		kind: z.literal("callTool"),
		name: z.string().min(1),
		arguments: z.record(z.string(), z.unknown()),
	}),
	z.object({
		id: z.number().int(),
		kind: z.literal("stop"),
	}),
]);
const daemonResponseSchema = z.union([
	z.object({
		id: z.number().int(),
		ok: z.literal(true),
		running: z.boolean().optional(),
		pid: z.number().int().optional(),
		result: z.unknown().optional(),
		stopped: z.boolean().optional(),
	}),
	z.object({
		id: z.number().int(),
		ok: z.literal(false),
		error: z.string().min(1),
	}),
]);
const daemonToolResultSchema = z.object({
	isError: z.boolean().optional(),
	structuredContent: z.unknown().optional(),
	text: z.string().optional(),
});
const structuredToolErrorSchema = z.object({
	type: z.literal("error"),
	data: z.string().min(1),
});
let bridgeClient: Awaited<ReturnType<typeof createXcodeBridgeClient>> | null = null;

async function bindDaemonCleanup(server: net.Server): Promise<void> {
	const cleanup = async () => {
		server.close();
		await Promise.all([
			rm(resolveDaemonSocketPath(), { force: true }),
			rm(resolveDaemonPidFilePath(), { force: true }),
		]);
	};
	process.on("SIGTERM", () => {
		void cleanup().finally(() => {
			process.exit(0);
		});
	});
	process.on("SIGINT", () => {
		void cleanup().finally(() => {
			process.exit(0);
		});
	});
}

async function handleDaemonRequest(
	server: net.Server,
	socket: net.Socket,
	line: string,
): Promise<void> {
	const request = daemonRequestSchema.parse(JSON.parse(line));
	if (request.kind === "ping") {
		writeDaemonResponse(socket, {
			id: request.id,
			ok: true,
			running: true,
			pid: process.pid,
		});
		return;
	}
	if (request.kind === "callTool") {
		const client = await readOrCreateBridgeClient();
		const result = await client.callTool({
			name: request.name,
			arguments: request.arguments,
		});
		writeDaemonResponse(socket, {
			id: request.id,
			ok: true,
			result,
			running: true,
		});
		return;
	}
	if (request.kind === "stop") {
		if (bridgeClient) {
			await bridgeClient.close();
			bridgeClient = null;
		}
		writeDaemonResponse(socket, {
			id: request.id,
			ok: true,
			running: false,
			stopped: true,
		});
		server.close(async () => {
			await Promise.all([
				rm(resolveDaemonSocketPath(), { force: true }),
				rm(resolveDaemonPidFilePath(), { force: true }),
			]);
			process.exit(0);
		});
		return;
	}
}

function readDaemonRequestId(line: string): number | null {
	try {
		const parsed = JSON.parse(line);
		return typeof parsed.id === "number" ? parsed.id : null;
	} catch {
		return null;
	}
}

function toDaemonErrorMessage(error: unknown): string {
	if (error instanceof Error && error.message.trim().length > 0) {
		return error.message;
	}
	return String(error);
}

async function handleDaemonRequestSafely(
	server: net.Server,
	socket: net.Socket,
	line: string,
): Promise<void> {
	try {
		await handleDaemonRequest(server, socket, line);
	} catch (error) {
		const id = readDaemonRequestId(line);
		if (id === null) {
			socket.destroy();
			return;
		}
		writeDaemonResponse(socket, {
			id,
			ok: false,
			error: toDaemonErrorMessage(error),
		});
	}
}

function writeDaemonResponse(socket: net.Socket, response: DaemonResponse): void {
	socket.write(`${JSON.stringify(response)}\n`);
}

function appendCompleteLines(input: {
	buffer: string;
	chunk: string;
	onLine: (line: string) => void;
}): string {
	const lines = `${input.buffer}${input.chunk}`.split("\n");
	const nextBuffer = lines.pop() ?? "";
	for (const line of lines) {
		input.onLine(line);
	}
	return nextBuffer;
}

async function sendDaemonRequest(request: DaemonRequest): Promise<DaemonResponse> {
	const socketPath = resolveDaemonSocketPath();
	return new Promise((resolve, reject) => {
		const socket = net.createConnection(socketPath);
		let buffer = "";
		let settled = false;
		const connectTimeoutMs = request.kind === "callTool"
			? DAEMON_TOOL_CONNECT_TIMEOUT_MS
			: DAEMON_PING_CONNECT_TIMEOUT_MS;
		const timeout = setTimeout(() => {
			settle(() => {
				socket.destroy();
				reject(runtimeError("Timed out while contacting daemon."));
			});
		}, connectTimeoutMs);
		const settle = (callback: () => void) => {
			if (settled) {
				return;
			}
			settled = true;
			clearTimeout(timeout);
			callback();
		};
		socket.setEncoding("utf8");
		socket.on("connect", () => {
			clearTimeout(timeout);
			socket.write(`${JSON.stringify(request)}\n`);
		});
		socket.on("data", (chunk) => {
			buffer = appendCompleteLines({
				buffer,
				chunk: String(chunk),
				onLine: (line) => {
					if (!line) {
						return;
					}
					socket.end();
					settle(() => {
						resolve(daemonResponseSchema.parse(JSON.parse(line)));
					});
				},
			});
		});
		socket.on("end", () => {
			settle(() => {
				reject(runtimeError("Daemon closed the connection without replying."));
			});
		});
		socket.on("error", (error) => {
			settle(() => {
				reject(runtimeError(`Failed to contact daemon. ${error.message}`));
			});
		});
	});
}

function bindDaemonRequestServer(server: net.Server, socket: net.Socket): void {
	let buffer = "";
	socket.setEncoding("utf8");
	socket.on("data", (chunk) => {
		buffer = appendCompleteLines({
			buffer,
			chunk: String(chunk),
			onLine: (line) => {
				if (line.trim().length === 0) {
					return;
				}
				void handleDaemonRequestSafely(server, socket, line);
			},
		});
	});
}

async function waitForDaemonReady(): Promise<DaemonStatus> {
	for (let attempt = 0; attempt < 40; attempt += 1) {
		const status = await readDaemonStatus();
		if (status.running) {
			return status;
		}
		await delay(50);
	}
	throw runtimeError("Timed out while starting the daemon.");
}

async function waitForProcessExit(pid: number): Promise<void> {
	for (let attempt = 0; attempt < 40; attempt += 1) {
		try {
			process.kill(pid, 0);
		} catch (error) {
			if (error instanceof Error && "code" in error && error.code === "ESRCH") {
				return;
			}
			throw error;
		}
		await delay(50);
	}
	throw runtimeError("Timed out while stopping the daemon.");
}

async function readOrCreateBridgeClient(): Promise<
	Awaited<ReturnType<typeof createXcodeBridgeClient>>
> {
	if (bridgeClient) {
		return bridgeClient;
	}
	bridgeClient = await createXcodeBridgeClient();
	await setBridgeConnectionState({
		bridgeProcessId: bridgeClient.bridgeProcessId,
		lastXcodeConnectionSucceeded: true,
	});
	await setCachedTools(await bridgeClient.listTools());
	return bridgeClient;
}

async function delay(ms: number): Promise<void> {
	await new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

function readDaemonToolErrorMessage(result: unknown): string | null {
	const parsed = daemonToolResultSchema.safeParse(result);
	if (!parsed.success) {
		return null;
	}
	const structuredError = structuredToolErrorSchema.safeParse(parsed.data.structuredContent);
	if (structuredError.success) {
		return structuredError.data.data;
	}
	if (!parsed.data.isError) {
		return null;
	}
	const text = parsed.data.text?.trim();
	if (text) {
		return text;
	}
	return "Xcode MCP tool failed.";
}

export async function callDaemonTool(input: {
	arguments: Record<string, unknown>;
	name: string;
}): Promise<unknown> {
	await startDaemon();
	const response = await sendDaemonRequest({
		id: 1,
		kind: "callTool",
		name: input.name,
		arguments: input.arguments,
	});
	if (response.ok) {
		const toolErrorMessage = readDaemonToolErrorMessage(response.result);
		if (toolErrorMessage) {
			throw runtimeError(toolErrorMessage);
		}
		return response.result;
	}
	throw runtimeError(response.error);
}

export async function readDaemonStatus(): Promise<DaemonStatus> {
	try {
		const response = await sendDaemonRequest({
			id: 1,
			kind: "ping",
		});
		if (response.ok && response.running && response.pid) {
			return {
				running: true,
				pid: response.pid,
			};
		}
		return {
			running: false,
		};
	} catch {
		return {
			running: false,
		};
	}
}

export async function startDaemon(): Promise<DaemonStatus> {
	const existingStatus = await readDaemonStatus();
	if (existingStatus.running) {
		return existingStatus;
	}
	await mkdir(resolveStateRoot(), { recursive: true });
	const logFile = openSync(resolveDaemonLogFilePath(), "a");
	const child = spawn(process.execPath, [daemonEntryPath], {
		detached: true,
		env: process.env,
		stdio: ["ignore", logFile, logFile],
	});
	child.unref();
	return waitForDaemonReady();
}

export async function stopDaemon(): Promise<void> {
	const status = await readDaemonStatus();
	if (!status.running) {
		return;
	}
	process.kill(status.pid, "SIGTERM");
	await waitForProcessExit(status.pid);
}

export async function restartDaemon(): Promise<DaemonStatus> {
	await stopDaemon();
	return startDaemon();
}

export async function runDaemonHost(): Promise<void> {
	await mkdir(resolveStateRoot(), { recursive: true });
	await rm(resolveDaemonSocketPath(), { force: true });
	await writeFile(resolveDaemonPidFilePath(), `${process.pid}\n`);
	const server = net.createServer((socket) => {
		bindDaemonRequestServer(server, socket);
	});
	await new Promise<void>((resolve, reject) => {
		server.once("error", reject);
		server.listen(resolveDaemonSocketPath(), () => {
			server.off("error", reject);
			resolve();
		});
	});
	void bindDaemonCleanup(server);
}
