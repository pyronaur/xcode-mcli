import { chmod, mkdtemp, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { expect, test } from "vitest";

import { runXcodeMcli } from "../src/core/command-dispatch.ts";
import { captureConsoleLogs } from "./helpers/console.ts";

async function writeFakeXcrun(root: string): Promise<string> {
	const scriptPath = join(root, "fake-xcrun.sh");
	const script = [
		"#!/bin/sh",
		'if [ "$1" = "--find" ] && [ "$2" = "mcpbridge" ]; then',
		'  echo "/mock/bin/mcpbridge"',
		"  exit 0",
		"fi",
		'if [ "$1" = "mcpbridge" ] && [ "$2" = "--help" ]; then',
		'  echo "mcpbridge - STDIO Bridge for Xcode MCP Tools"',
		"  exit 0",
		"fi",
		'echo "unexpected args: $@" >&2',
		"exit 1",
	].join("\n");
	await writeFile(scriptPath, script);
	await chmod(scriptPath, 0o755);
	return scriptPath;
}

test("setup verifies xcrun mcpbridge access and creates state root", async () => {
	const workspace = await mkdtemp(join(tmpdir(), "xcode-mcli-setup-"));
	const stateRoot = join(workspace, "state");
	process.env.XCODE_MCLI_STATE_ROOT = stateRoot;
	process.env.XCODE_MCLI_XCRUN_PATH = await writeFakeXcrun(workspace);
	try {
		const lines = await captureConsoleLogs(async () => {
			await runXcodeMcli(["setup"], process.cwd());
		});
		expect(lines).toContain("xcode-mcli setup complete.");
		await expect(stat(stateRoot)).resolves.toBeDefined();
	} finally {
		delete process.env.XCODE_MCLI_STATE_ROOT;
		delete process.env.XCODE_MCLI_XCRUN_PATH;
	}
});
