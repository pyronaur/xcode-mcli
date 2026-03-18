import { expect, test } from "vitest";
import { runXcodeMcli } from "../src/core/command-dispatch.ts";
import { TemplateError } from "../src/core/errors.ts";
import { captureConsoleLogs } from "./helpers/console.ts";
import { createFakeXcrunEnvironment } from "./helpers/fake-xcrun.ts";
import { captureProcessOutput } from "./helpers/process-io.ts";

test("dispatch prints top-level help when no args", async () => {
	const output = await captureProcessOutput(async () => {
		await runXcodeMcli([], process.cwd());
	});
	expect(output.stdout).toContain("Usage:");
	expect(output.stdout).toContain("xcode-mcli");
	expect(output.stdout).toContain("setup");
	expect(output.stdout).toContain("daemon");
	expect(output.stdout).toContain("windows");
	expect(output.stdout).toContain("Agent Workflow:");
	expect(output.stdout).toContain("xcode-mcli setup");
	expect(output.stdout).toContain("xcode-mcli windows list");
	expect(output.stdout).toContain("xcode-mcli windows use --tab-identifier windowtab1");
	expect(output.stdout).not.toContain("hello");
});

test("dispatch prints command help from help subcommand", async () => {
	const output = await captureProcessOutput(async () => {
		await runXcodeMcli(["help", "setup"], process.cwd());
	});
	expect(output.stdout).toContain("Usage: xcode-mcli setup");
	expect(output.stdout).toContain("Prepare xcode-mcli");
});

test("dispatch prints group help from help subcommand", async () => {
	const output = await captureProcessOutput(async () => {
		await runXcodeMcli(["help", "windows"], process.cwd());
	});
	expect(output.stdout).toContain("Usage: xcode-mcli windows");
	expect(output.stdout).toContain("use");
});

test("dispatch prints tests run-some guidance from help subcommand", async () => {
	const output = await captureProcessOutput(async () => {
		await runXcodeMcli(["tests", "run-some", "--help"], process.cwd());
	});
	expect(output.stdout).toContain("targetName=<target>");
	expect(output.stdout).toContain("testIdentifier=<identifier>");
});

test("dispatch prints version from global option", async () => {
	const output = await captureProcessOutput(async () => {
		await runXcodeMcli(["--version"], process.cwd());
	});
	expect(output.stdout).toMatch(/\d+\.\d+\.\d+/);
});

test("dispatch throws usage error for unknown command", async () => {
	try {
		await runXcodeMcli(["wat"], process.cwd());
		throw new Error("Expected usage error.");
	} catch (error) {
		if (!(error instanceof TemplateError)) {
			throw error;
		}
		expect(error.exitCode).toBe(2);
		expect(error.message).toContain("unknown command");
	}
});

test("dispatch accepts --json and prints a stable success envelope", async () => {
	const environment = await createFakeXcrunEnvironment({});
	process.env.XCODE_MCLI_STATE_ROOT = environment.stateRoot;
	process.env.XCODE_MCLI_XCRUN_PATH = environment.xcrunPath;
	try {
		const lines = await captureConsoleLogs(async () => {
			await runXcodeMcli(["setup", "--json"], process.cwd());
		});
		expect(lines).toHaveLength(1);
		expect(JSON.parse(lines[0] ?? "")).toEqual({
			ok: true,
			command: "setup",
			data: {
				message: "xcode-mcli setup complete.",
			},
		});
	} finally {
		delete process.env.XCODE_MCLI_STATE_ROOT;
		delete process.env.XCODE_MCLI_XCRUN_PATH;
	}
});

test("dispatch throws usage error for schema validation failure", async () => {
	try {
		await runXcodeMcli(
			["windows", "use", "--tab-identifier", "   "],
			process.cwd(),
		);
		throw new Error("Expected usage error.");
	} catch (error) {
		if (!(error instanceof TemplateError)) {
			throw error;
		}
		expect(error.exitCode).toBe(2);
		expect(error.message).toContain("Invalid options for command: windows use");
	}
});

test("dispatch accepts a global tab identifier before the subcommand", async () => {
	const lines = await captureConsoleLogs(async () => {
		await runXcodeMcli(
			["--tab-identifier", "windowtab1", "windows", "use", "--json"],
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
});
