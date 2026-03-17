import { expect, test } from "vitest";
import { runXcodeMcli } from "../src/core/command-dispatch.ts";
import { TemplateError } from "../src/core/errors.ts";
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

test("dispatch throws usage error for unknown option", async () => {
	try {
		await runXcodeMcli(["setup", "--json"], process.cwd());
		throw new Error("Expected usage error.");
	} catch (error) {
		if (!(error instanceof TemplateError)) {
			throw error;
		}
		expect(error.exitCode).toBe(2);
		expect(error.message).toContain("unknown option");
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
