import { expect, test } from "vitest";

import { runXcodeMcli } from "../src/core/command-dispatch.ts";
import { captureProcessOutput } from "./helpers/process-io.ts";

test("top-level help gives agents the first-run workflow and safety rules", async () => {
	const output = await captureProcessOutput(async () => {
		await runXcodeMcli([], process.cwd());
	});
	expect(output.stdout).toContain("Agent Workflow:");
	expect(output.stdout).toContain(
		"If the first live Xcode command triggers a macOS approval dialog",
	);
	expect(output.stdout).toContain("prefer `--json` when another agent or script will parse the result");
	expect(output.stdout).toContain("are destructive and require `--yes`");
	expect(output.stdout).toContain("compatibility verification, not everyday project work");
	expect(output.stdout).toContain("xcode-mcli project build");
	expect(output.stdout).toContain("xcode-mcli tests list");
});

test("group help calls out tab pinning, mutation safety, and compatibility scope", async () => {
	const windowsHelp = await captureProcessOutput(async () => {
		await runXcodeMcli(["help", "windows"], process.cwd());
	});
	expect(windowsHelp.stdout).toContain("stable cached tab");

	const filesHelp = await captureProcessOutput(async () => {
		await runXcodeMcli(["help", "files"], process.cwd());
	});
	expect(filesHelp.stdout).toContain("Use `update`, `write`, `rm`, and `mv --overwrite-existing` only with `--yes`.");

	const surfaceHelp = await captureProcessOutput(async () => {
		await runXcodeMcli(["help", "surface"], process.cwd());
	});
	expect(surfaceHelp.stdout).toContain("compatibility and release maintenance");
});

test("setup and focused leaf help explain approval prompts and argument formats", async () => {
	const setupHelp = await captureProcessOutput(async () => {
		await runXcodeMcli(["setup", "--help"], process.cwd());
	});
	expect(setupHelp.stdout).toContain("The first live Xcode command after setup may pause for a macOS approval dialog.");

	const runSomeHelp = await captureProcessOutput(async () => {
		await runXcodeMcli(["tests", "run-some", "--help"], process.cwd());
	});
	expect(runSomeHelp.stdout).toContain("Repeat `--test` for each field in each selected test.");
	expect(runSomeHelp.stdout).toContain("MyOtherTests/testSadPath");

	const grepHelp = await captureProcessOutput(async () => {
		await runXcodeMcli(["files", "grep", "--help"], process.cwd());
	});
	expect(grepHelp.stdout).toContain("`files_with_matches` prints matching file paths.");
	expect(grepHelp.stdout).toContain("`count` prints the number of matches.");
});

test.each([
	["files", "update", "--help"],
	["files", "write", "--help"],
	["files", "rm", "--help"],
])("mutating file command help warns that %s %s requires confirmation", async (...args) => {
	const output = await captureProcessOutput(async () => {
		await runXcodeMcli(args, process.cwd());
	});
	expect(output.stdout).toContain("requires `--yes`");
});

test("files mv help limits --yes guidance to overwrite flow", async () => {
	const output = await captureProcessOutput(async () => {
		await runXcodeMcli(["files", "mv", "--help"], process.cwd());
	});
	expect(output.stdout).toContain("Pass `--yes` only when using `--overwrite-existing`.");
});
