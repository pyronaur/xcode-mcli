import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { expect, test } from "vitest";

import { runXcodeMcli } from "../src/core/command-dispatch.ts";
import { captureConsoleLogs } from "./helpers/console.ts";
import { createFakeXcrunEnvironment } from "./helpers/fake-xcrun.ts";

async function withTimeout<T>(label: string, action: () => Promise<T>): Promise<T> {
	return Promise.race([
		action(),
		new Promise<T>((_, reject) => {
			setTimeout(() => {
				reject(new Error(`Timed out while waiting for ${label}.`));
			}, 4000);
		}),
	]);
}

function processExists(pid: number): boolean {
	try {
		process.kill(pid, 0);
		return true;
	} catch (error) {
		if (error instanceof Error && "code" in error && error.code === "ESRCH") {
			return false;
		}
		throw error;
	}
}

async function readStateJson<T>(stateRoot: string): Promise<T> {
	return JSON.parse(await readFile(join(stateRoot, "state.json"), "utf8")) as T;
}

test("daemon lifecycle commands start, report, and stop the daemon", async () => {
	const stateRoot = await mkdtemp(join(tmpdir(), "xcode-mcli-daemon-life-"));
	process.env.XCODE_MCLI_STATE_ROOT = stateRoot;
	try {
		const startLines = await withTimeout("daemon start", async () =>
			captureConsoleLogs(async () => {
			await runXcodeMcli(["daemon", "start"], process.cwd());
			}),
		);
		expect(startLines).toEqual(["Daemon started."]);

		const statusLines = await withTimeout("daemon status", async () =>
			captureConsoleLogs(async () => {
			await runXcodeMcli(["daemon", "status"], process.cwd());
			}),
		);
		expect(statusLines[0]).toMatch(/^Daemon is running with PID \d+\.$/);

		const restartLines = await withTimeout("daemon restart", async () =>
			captureConsoleLogs(async () => {
			await runXcodeMcli(["daemon", "restart"], process.cwd());
			}),
		);
		expect(restartLines).toEqual(["Daemon restarted."]);

		const restartedStatusLines = await withTimeout("daemon status after restart", async () =>
			captureConsoleLogs(async () => {
			await runXcodeMcli(["daemon", "status"], process.cwd());
			}),
		);
		expect(restartedStatusLines[0]).toMatch(/^Daemon is running with PID \d+\.$/);

		const stopLines = await withTimeout("daemon stop", async () =>
			captureConsoleLogs(async () => {
			await runXcodeMcli(["daemon", "stop"], process.cwd());
			}),
		);
		expect(stopLines).toEqual(["Daemon stopped."]);
	} finally {
		delete process.env.XCODE_MCLI_STATE_ROOT;
	}
});

test("daemon start replaces a live daemon whose socket disappeared", async () => {
	const stateRoot = await mkdtemp(join(tmpdir(), "xcode-mcli-daemon-stale-"));
	process.env.XCODE_MCLI_STATE_ROOT = stateRoot;
	try {
		await runXcodeMcli(["daemon", "start"], process.cwd());
		const firstPid = Number.parseInt(
			await readFile(join(stateRoot, "daemon.pid"), "utf8"),
			10,
		);
		expect(processExists(firstPid)).toBe(true);

		await rm(join(stateRoot, "daemon.sock"), { force: true });

		await runXcodeMcli(["daemon", "start"], process.cwd());
		const secondPid = Number.parseInt(
			await readFile(join(stateRoot, "daemon.pid"), "utf8"),
			10,
		);
		expect(secondPid).not.toBe(firstPid);

		await expect.poll(() => processExists(firstPid)).toBe(false);
		expect(processExists(secondPid)).toBe(true);
	} finally {
		await runXcodeMcli(["daemon", "stop"], process.cwd());
		delete process.env.XCODE_MCLI_STATE_ROOT;
	}
});

test("daemon stop shuts down the active bridge child", async () => {
	const environment = await createFakeXcrunEnvironment({
		tools: [
			{
				name: "XcodeListWindows",
				description: "List windows.",
				inputSchema: {
					type: "object",
					properties: {},
				},
			},
		],
		callResults: {
			XcodeListWindows: {
				content: [
					{
						type: "text",
						text: "* tabIdentifier: windowtab1, workspacePath: /tmp/Countdown.xcworkspace\n",
					},
				],
				structuredContent: {
					message: "* tabIdentifier: windowtab1, workspacePath: /tmp/Countdown.xcworkspace\n",
				},
			},
		},
	});
	process.env.XCODE_MCLI_STATE_ROOT = environment.stateRoot;
	process.env.XCODE_MCLI_XCRUN_PATH = environment.xcrunPath;
	try {
		await captureConsoleLogs(async () => {
			await runXcodeMcli(["windows", "list"], process.cwd());
		});
		const daemonPid = Number.parseInt(
			await readFile(join(environment.stateRoot, "daemon.pid"), "utf8"),
			10,
		);
		const state = await readStateJson<{
			bridgeProcessId?: number;
		}>(environment.stateRoot);
		expect(state.bridgeProcessId).toEqual(expect.any(Number));
		const bridgePid = state.bridgeProcessId ?? 0;
		expect(processExists(daemonPid)).toBe(true);
		expect(processExists(bridgePid)).toBe(true);

		await runXcodeMcli(["daemon", "stop"], process.cwd());

		await expect.poll(() => processExists(daemonPid)).toBe(false);
		await expect.poll(() => processExists(bridgePid)).toBe(false);
	} finally {
		delete process.env.XCODE_MCLI_STATE_ROOT;
		delete process.env.XCODE_MCLI_XCRUN_PATH;
	}
});

test("daemon lifecycle commands print stable JSON envelopes", async () => {
	const stateRoot = await mkdtemp(join(tmpdir(), "xcode-mcli-daemon-life-json-"));
	process.env.XCODE_MCLI_STATE_ROOT = stateRoot;
	try {
		const startLines = await withTimeout("daemon start json", async () =>
			captureConsoleLogs(async () => {
				await runXcodeMcli(["daemon", "start", "--json"], process.cwd());
			}),
		);
		expect(JSON.parse(startLines[0] ?? "")).toEqual({
			ok: true,
			command: "daemon start",
			data: {
				running: true,
			},
		});

		const restartLines = await withTimeout("daemon restart json", async () =>
			captureConsoleLogs(async () => {
				await runXcodeMcli(["daemon", "restart", "--json"], process.cwd());
			}),
		);
		expect(JSON.parse(restartLines[0] ?? "")).toEqual({
			ok: true,
			command: "daemon restart",
			data: {
				running: true,
			},
		});

		const stopLines = await withTimeout("daemon stop json", async () =>
			captureConsoleLogs(async () => {
				await runXcodeMcli(["daemon", "stop", "--json"], process.cwd());
			}),
		);
		expect(JSON.parse(stopLines[0] ?? "")).toEqual({
			ok: true,
			command: "daemon stop",
			data: {
				running: false,
			},
		});
	} finally {
		delete process.env.XCODE_MCLI_STATE_ROOT;
	}
});
