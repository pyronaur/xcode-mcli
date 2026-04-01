import { rm } from "node:fs/promises";
import net from "node:net";
import { z } from "zod";

import { runtimeError } from "../core/errors.ts";
import { isNodeErrorWithCode } from "./daemon-process.ts";
import { resolveDaemonSocketPath } from "./env.ts";

export type DaemonRequest =
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

export type DaemonResponse =
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

function listenServer(server: net.Server, socketPath: string): Promise<void> {
	return new Promise((resolve, reject) => {
		server.once("error", reject);
		server.listen(socketPath, () => {
			server.off("error", reject);
			resolve();
		});
	});
}

export async function listenWithSocketOwnership(
	server: net.Server,
	input: {
		isDaemonRunning: () => Promise<boolean>;
	},
): Promise<"bound" | "existing"> {
	const socketPath = resolveDaemonSocketPath();
	try {
		await listenServer(server, socketPath);
		return "bound";
	} catch (error) {
		if (!isNodeErrorWithCode(error, "EADDRINUSE")) {
			throw error;
		}
		if (await input.isDaemonRunning()) {
			return "existing";
		}
		await rm(socketPath, { force: true });
		await listenServer(server, socketPath);
		return "bound";
	}
}

export async function sendDaemonRequest(
	request: DaemonRequest,
	input: {
		pingConnectTimeoutMs: number;
		toolConnectTimeoutMs: number;
	},
): Promise<DaemonResponse> {
	const socketPath = resolveDaemonSocketPath();
	return new Promise((resolve, reject) => {
		const socket = net.createConnection(socketPath);
		let buffer = "";
		let settled = false;
		const connectTimeoutMs = request.kind === "callTool"
			? input.toolConnectTimeoutMs
			: input.pingConnectTimeoutMs;
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

export function appendCompleteLines(input: {
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
