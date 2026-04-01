import { spawn } from "node:child_process";
import { openSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import net from "node:net";
import { fileURLToPath } from "node:url";
import { z } from "zod";

import { runtimeError } from "../core/errors.ts";
import {
	cleanupDaemonFiles,
	readLiveDaemonPid,
	waitForProcessExit,
} from "./daemon-process.ts";
import { setBridgeConnectionState, setCachedTools } from "./daemon-state.ts";
import {
	appendCompleteLines,
	type DaemonResponse,
	listenWithSocketOwnership,
	sendDaemonRequest,
} from "./daemon-transport.ts";
import {
	resolveDaemonLogFilePath,
	resolveDaemonPidFilePath,
	resolveStateRoot,
} from "./env.ts";
import { createXcodeBridgeClient } from "./xcode-client.ts";
import {
	parseRawToolCallResult,
	type ToolCallResult,
	type ToolName,
	validateToolCallResult,
} from "./xcode-tool-contract.ts";

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
const DAEMON_START_REUSE_ATTEMPTS = 10;
const DAEMON_START_REUSE_DELAY_MS = 50;
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

async function closeBridgeClient(): Promise<void> {
	if (!bridgeClient) {
		return;
	}
	const client = bridgeClient;
	bridgeClient = null;
	await client.close();
}

function closeServer(server: net.Server): Promise<void> {
	return new Promise((resolve, reject) => {
		server.close((error) => {
			if (error) {
				reject(error);
				return;
			}
			resolve();
		});
	});
}

function bindDaemonCleanup(server: net.Server): () => Promise<void> {
	let cleanupPromise: Promise<void> | null = null;
	const cleanup = async () => {
		if (cleanupPromise) {
			return cleanupPromise;
		}
		cleanupPromise = (async () => {
			await closeBridgeClient();
			await closeServer(server);
			await cleanupDaemonFiles();
		})();
		return cleanupPromise;
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
	return cleanup;
}

async function handleDaemonRequest(input: {
	line: string;
	shutdown: () => Promise<void>;
	socket: net.Socket;
}): Promise<void> {
	const request = daemonRequestSchema.parse(JSON.parse(input.line));
	if (request.kind === "ping") {
		writeDaemonResponse(input.socket, {
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
		writeDaemonResponse(input.socket, {
			id: request.id,
			ok: true,
			result,
			running: true,
		});
		return;
	}
	if (request.kind === "stop") {
		input.socket.end(`${
			JSON.stringify({
				id: request.id,
				ok: true,
				running: false,
				stopped: true,
			})
		}\n`, () => {
			void input.shutdown().finally(() => {
				process.exit(0);
			});
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

async function handleDaemonRequestSafely(input: {
	line: string;
	shutdown: () => Promise<void>;
	socket: net.Socket;
}): Promise<void> {
	try {
		await handleDaemonRequest(input);
	} catch (error) {
		const id = readDaemonRequestId(input.line);
		if (id === null) {
			input.socket.destroy();
			return;
		}
		writeDaemonResponse(input.socket, {
			id,
			ok: false,
			error: toDaemonErrorMessage(error),
		});
	}
}

function writeDaemonResponse(socket: net.Socket, response: DaemonResponse): void {
	socket.write(`${JSON.stringify(response)}\n`);
}

function bindDaemonRequestServer(input: {
	shutdown: () => Promise<void>;
	socket: net.Socket;
}): void {
	let buffer = "";
	input.socket.setEncoding("utf8");
	input.socket.on("data", (chunk) => {
		buffer = appendCompleteLines({
			buffer,
			chunk: String(chunk),
			onLine: (line) => {
				if (line.trim().length === 0) {
					return;
				}
				void handleDaemonRequestSafely({
					line,
					shutdown: input.shutdown,
					socket: input.socket,
				});
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

async function waitForReusableDaemon(): Promise<DaemonStatus> {
	for (let attempt = 0; attempt < DAEMON_START_REUSE_ATTEMPTS; attempt += 1) {
		const status = await readDaemonStatus();
		if (status.running) {
			return status;
		}
		const livePid = await readLiveDaemonPid();
		if (!livePid) {
			return {
				running: false,
			};
		}
		await delay(DAEMON_START_REUSE_DELAY_MS);
	}
	return {
		running: false,
	};
}

async function stopStaleDaemon(pid: number): Promise<void> {
	process.kill(pid, "SIGTERM");
	await waitForProcessExit(pid);
	await cleanupDaemonFiles();
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

export async function callDaemonTool<K extends ToolName>(input: {
	arguments: Record<string, unknown>;
	name: K;
}): Promise<ToolCallResult<K>> {
	await startDaemon();
	const response = await sendDaemonRequest({
		id: 1,
		kind: "callTool",
		name: input.name,
		arguments: input.arguments,
	}, {
		pingConnectTimeoutMs: DAEMON_PING_CONNECT_TIMEOUT_MS,
		toolConnectTimeoutMs: DAEMON_TOOL_CONNECT_TIMEOUT_MS,
	});
	if (response.ok) {
		const rawResult = parseRawToolCallResult(response.result);
		const toolErrorMessage = readDaemonToolErrorMessage(rawResult);
		if (toolErrorMessage) {
			throw runtimeError(toolErrorMessage);
		}
		return validateToolCallResult(input.name, rawResult);
	}
	throw runtimeError(response.error);
}

export async function readDaemonStatus(): Promise<DaemonStatus> {
	try {
		const response = await sendDaemonRequest({
			id: 1,
			kind: "ping",
		}, {
			pingConnectTimeoutMs: DAEMON_PING_CONNECT_TIMEOUT_MS,
			toolConnectTimeoutMs: DAEMON_TOOL_CONNECT_TIMEOUT_MS,
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
	const reusableStatus = await waitForReusableDaemon();
	if (reusableStatus.running) {
		return reusableStatus;
	}
	const stalePid = await readLiveDaemonPid();
	if (stalePid) {
		await stopStaleDaemon(stalePid);
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
	if (status.running) {
		process.kill(status.pid, "SIGTERM");
		await waitForProcessExit(status.pid);
		return;
	}
	const stalePid = await readLiveDaemonPid();
	if (!stalePid) {
		await cleanupDaemonFiles();
		return;
	}
	await stopStaleDaemon(stalePid);
}

export async function restartDaemon(): Promise<DaemonStatus> {
	await stopDaemon();
	return startDaemon();
}

export async function runDaemonHost(): Promise<void> {
	await mkdir(resolveStateRoot(), { recursive: true });
	const server = net.createServer((socket) => {
		bindDaemonRequestServer({
			shutdown,
			socket,
		});
	});
	const shutdown = bindDaemonCleanup(server);
	const listenResult = await listenWithSocketOwnership(server, {
		isDaemonRunning: async () => (await readDaemonStatus()).running,
	});
	if (listenResult === "existing") {
		server.close();
		return;
	}
	await writeFile(resolveDaemonPidFilePath(), `${process.pid}\n`);
}
