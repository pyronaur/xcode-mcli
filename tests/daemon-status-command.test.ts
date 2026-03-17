import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { expect, test } from "vitest";

import { runXcodeMcli } from "../src/core/command-dispatch.ts";
import { captureConsoleLogs } from "./helpers/console.ts";

test("daemon status reports when the daemon is not running", async () => {
	const stateRoot = await mkdtemp(join(tmpdir(), "xcode-mcli-daemon-"));
	process.env.XCODE_MCLI_STATE_ROOT = stateRoot;
	try {
		const lines = await captureConsoleLogs(async () => {
			await runXcodeMcli(["daemon", "status"], process.cwd());
		});
		expect(lines).toEqual(["Daemon is not running."]);
	} finally {
		delete process.env.XCODE_MCLI_STATE_ROOT;
	}
});
