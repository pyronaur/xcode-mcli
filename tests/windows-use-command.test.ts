import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { expect, test } from "vitest";

import { runXcodeMcli } from "../src/core/command-dispatch.ts";
import { captureConsoleLogs } from "./helpers/console.ts";

test("windows use stores the active tab in daemon state", async () => {
	const stateRoot = await mkdtemp(join(tmpdir(), "xcode-mcli-state-"));
	process.env.XCODE_MCLI_STATE_ROOT = stateRoot;
	try {
		const lines = await captureConsoleLogs(async () => {
			await runXcodeMcli(
				["windows", "use", "--tab-identifier", "windowtab1"],
				process.cwd(),
			);
		});
		expect(lines).toEqual(["Active Xcode tab set to windowtab1."]);
		const stateFile = join(stateRoot, "state.json");
		const state = JSON.parse(await readFile(stateFile, "utf8")) as {
			activeTabIdentifier?: string;
		};
		expect(state.activeTabIdentifier).toBe("windowtab1");
	} finally {
		delete process.env.XCODE_MCLI_STATE_ROOT;
	}
});

test("windows use prints a stable JSON envelope", async () => {
	const stateRoot = await mkdtemp(join(tmpdir(), "xcode-mcli-state-json-"));
	process.env.XCODE_MCLI_STATE_ROOT = stateRoot;
	try {
		const lines = await captureConsoleLogs(async () => {
			await runXcodeMcli(
				["windows", "use", "--tab-identifier", "windowtab1", "--json"],
				process.cwd(),
			);
		});
		expect(lines).toHaveLength(1);
		expect(JSON.parse(lines[0] ?? "")).toEqual({
			ok: true,
			command: "windows use",
			tabIdentifier: "windowtab1",
			data: {
				tabIdentifier: "windowtab1",
			},
		});
	} finally {
		delete process.env.XCODE_MCLI_STATE_ROOT;
	}
});
