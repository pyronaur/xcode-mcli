import { spawn } from "node:child_process";
import { openSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import net from "node:net";
import { fileURLToPath } from "node:url";
import { z } from "zod";

import { runtimeError } from "../core/errors.ts";
import {
	resolveDaemonLogFilePath,
	resolveDaemonPidFilePath,
	resolveDaemonSocketPath,
	resolveStateRoot,
} from "./env.ts";

type DaemonRequest =
	| {
		id: number;
		kind: "ping";
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
		running: boolean;
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
const daemonRequestSchema = z.discriminatedUnion("kind", [
	z.object({
		id: z.number().int(),
		kind: z.literal("ping"),
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
		running: z.boolean(),
		pid: z.number().int().optional(),
		stopped: z.boolean().optional(),
	}),
	z.object({
		id: z.number().int(),
		ok: z.literal(false),
		error: z.string().min(1),
	}),
]);

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
	if (request.kind === "stop") {
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

function writeDaemonResponse(socket: net.Socket, response: DaemonResponse): void {
	socket.write(`${JSON.stringify(response)}\n`);
}

async function sendDaemonRequest(request: DaemonRequest): Promise<DaemonResponse> {
	const socketPath = resolveDaemonSocketPath();
	return new Promise((resolve, reject) => {
		const socket = net.createConnection(socketPath);
		let buffer = "";
		socket.setEncoding("utf8");
		socket.on("connect", () => {
			socket.write(`${JSON.stringify(request)}\n`);
		});
		socket.on("data", (chunk) => {
			buffer += chunk;
			const [line] = buffer.split("\n");
			if (!line) {
				return;
			}
			socket.end();
			resolve(daemonResponseSchema.parse(JSON.parse(line)));
		});
		socket.on("error", (error) => {
			reject(runtimeError(`Failed to contact daemon. ${error.message}`));
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

async function waitForDaemonExit(): Promise<void> {
	for (let attempt = 0; attempt < 40; attempt += 1) {
		const status = await readDaemonStatus();
		if (!status.running) {
			return;
		}
		await delay(50);
	}
	throw runtimeError("Timed out while stopping the daemon.");
}

async function delay(ms: number): Promise<void> {
	await new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
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
	spawn(process.execPath, [daemonEntryPath], {
		detached: true,
		env: process.env,
		stdio: ["ignore", logFile, logFile],
	});
	return waitForDaemonReady();
}

export async function stopDaemon(): Promise<void> {
	const status = await readDaemonStatus();
	if (!status.running) {
		return;
	}
	await sendDaemonRequest({
		id: 1,
		kind: "stop",
	});
	await waitForDaemonExit();
}

export async function runDaemonHost(): Promise<void> {
	await mkdir(resolveStateRoot(), { recursive: true });
	await rm(resolveDaemonSocketPath(), { force: true });
	await writeFile(resolveDaemonPidFilePath(), `${process.pid}\n`);
	const server = net.createServer((socket) => {
		let buffer = "";
		socket.setEncoding("utf8");
		socket.on("data", (chunk) => {
			buffer += chunk;
			const lines = buffer.split("\n");
			buffer = lines.pop() ?? "";
			for (const line of lines) {
				if (line.trim().length === 0) {
					continue;
				}
				void handleDaemonRequest(server, socket, line);
			}
		});
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
