import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { expect, test } from "vitest";

import { runXcodeMcli } from "../src/core/command-dispatch.ts";
import { captureConsoleLogs } from "./helpers/console.ts";

test("daemon lifecycle commands start, report, and stop the daemon", async () => {
	const stateRoot = await mkdtemp(join(tmpdir(), "xcode-mcli-daemon-life-"));
	process.env.XCODE_MCLI_STATE_ROOT = stateRoot;
	try {
		const startLines = await captureConsoleLogs(async () => {
			await runXcodeMcli(["daemon", "start"], process.cwd());
		});
		expect(startLines).toEqual(["Daemon started."]);

		const statusLines = await captureConsoleLogs(async () => {
			await runXcodeMcli(["daemon", "status"], process.cwd());
		});
		expect(statusLines[0]).toMatch(/^Daemon is running with PID \d+\.$/);

		const stopLines = await captureConsoleLogs(async () => {
			await runXcodeMcli(["daemon", "stop"], process.cwd());
		});
		expect(stopLines).toEqual(["Daemon stopped."]);
	} finally {
		delete process.env.XCODE_MCLI_STATE_ROOT;
	}
});
