import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { expect, test } from "vitest";

import { runXcodeMcli } from "../src/core/command-dispatch.ts";
import { captureConsoleLogs } from "./helpers/console.ts";

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
