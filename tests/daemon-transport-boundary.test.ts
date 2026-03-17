import net from "node:net";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

import { expect, test } from "vitest";

import { EXIT_RUNTIME_ERROR } from "../src/constants.ts";
import { runCliProcess } from "./helpers/cli-process.ts";

type FakeDaemonRequest = {
	id: number;
	kind: "callTool" | "ping" | "stop";
};

async function withFakeDaemon(
	handler: (socket: net.Socket, request: FakeDaemonRequest) => Promise<void> | void,
	run: (input: { stateRoot: string }) => Promise<void>,
): Promise<void> {
	const stateRoot = await mkdtemp("/tmp/xcm-");
	const socketPath = join(stateRoot, "daemon.sock");
	await mkdir(stateRoot, { recursive: true });
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
				void handler(socket, JSON.parse(line) as FakeDaemonRequest);
			}
		});
	});
	await new Promise<void>((resolve, reject) => {
		server.once("error", reject);
		server.listen(socketPath, () => {
			server.off("error", reject);
			resolve();
		});
	});
	try {
		await run({ stateRoot });
	} finally {
		await new Promise<void>((resolve, reject) => {
			server.close((error) => {
				if (error) {
					reject(error);
					return;
				}
				resolve();
			});
		});
		await rm(stateRoot, { force: true, recursive: true });
	}
}

function writeDaemonResponse(
	socket: net.Socket,
	response: Record<string, unknown>,
): void {
	socket.write(`${JSON.stringify(response)}\n`);
}

test("cli accepts a chunked daemon response for large tool output", async () => {
	const repeatedChunk = "NavigationStack ".repeat(1024);
	const fullText = `${repeatedChunk}sentinel`;
	await withFakeDaemon(async (socket, request) => {
		if (request.kind === "ping") {
			writeDaemonResponse(socket, {
				id: request.id,
				ok: true,
				running: true,
				pid: process.pid,
			});
			return;
		}
		if (request.kind !== "callTool") {
			return;
		}
		const response = JSON.stringify({
			id: request.id,
			ok: true,
			running: true,
			result: {
				text: fullText,
			},
		});
		socket.write(response.slice(0, 1));
		await new Promise((resolve) => {
			setTimeout(resolve, 10);
		});
		socket.write(`${response.slice(1)}\n`);
	}, async ({ stateRoot }) => {
		const result = await runCliProcess({
			args: ["docs", "search", "--query", "NavigationStack", "--json"],
			env: {
				XCODE_MCLI_STATE_ROOT: stateRoot,
			},
		});
		expect(result.exitCode).toBe(0);
		expect(result.stderr).toBe("");
		expect(JSON.parse(result.stdout)).toEqual({
			ok: true,
			command: "docs search",
			tool: "DocumentationSearch",
			data: {
				text: fullText,
			},
		});
	});
});

test("cli returns a runtime error when the daemon closes the socket without a reply", async () => {
	await withFakeDaemon((socket, request) => {
		if (request.kind === "ping") {
			writeDaemonResponse(socket, {
				id: request.id,
				ok: true,
				running: true,
				pid: process.pid,
			});
			return;
		}
		if (request.kind !== "callTool") {
			return;
		}
		socket.end();
	}, async ({ stateRoot }) => {
		const result = await runCliProcess({
			args: [
				"issues",
				"file",
				"--file-path",
				"Countdown/CountdownApp.swift",
				"--tab-identifier",
				"windowtab1",
				"--json",
			],
			env: {
				XCODE_MCLI_STATE_ROOT: stateRoot,
			},
		});
		expect(result.exitCode).toBe(EXIT_RUNTIME_ERROR);
		expect(result.stderr).toBe("");
		expect(JSON.parse(result.stdout)).toEqual({
			ok: false,
			command: "issues file",
			tool: "XcodeRefreshCodeIssuesInFile",
			error: {
				kind: "runtime",
				message: "Daemon closed the connection without replying.",
			},
		});
	});
});

test("cli waits for a slow daemon tool reply after the socket connects", async () => {
	await withFakeDaemon(async (socket, request) => {
		if (request.kind === "ping") {
			writeDaemonResponse(socket, {
				id: request.id,
				ok: true,
				running: true,
				pid: process.pid,
			});
			return;
		}
		if (request.kind !== "callTool") {
			return;
		}
		await new Promise((resolve) => {
			setTimeout(resolve, 700);
		});
		writeDaemonResponse(socket, {
			id: request.id,
			ok: true,
			running: true,
			result: {
				text: "slow success",
			},
		});
	}, async ({ stateRoot }) => {
		const result = await runCliProcess({
			args: ["docs", "search", "--query", "NavigationPath", "--json"],
			env: {
				XCODE_MCLI_STATE_ROOT: stateRoot,
			},
		});
		expect(result.exitCode).toBe(0);
		expect(result.stderr).toBe("");
		expect(JSON.parse(result.stdout)).toEqual({
			ok: true,
			command: "docs search",
			tool: "DocumentationSearch",
			data: {
				text: "slow success",
			},
		});
	});
});
