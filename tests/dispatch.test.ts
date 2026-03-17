import { expect, test } from "vitest";
import { runCommandTemplateCli } from "../src/core/command-dispatch.ts";
import { TemplateError } from "../src/core/errors.ts";
import { captureProcessOutput } from "./helpers/process-io.ts";

test("dispatch prints top-level help when no args", async () => {
	const output = await captureProcessOutput(async () => {
		await runCommandTemplateCli([], process.cwd());
	});
	expect(output.stdout).toContain("Usage:");
	expect(output.stdout).toContain("command-template");
	expect(output.stdout).toContain("hello");
	expect(output.stdout).toContain("project");
});

test("dispatch prints command help from help subcommand", async () => {
	const output = await captureProcessOutput(async () => {
		await runCommandTemplateCli(["help", "hello"], process.cwd());
	});
	expect(output.stdout).toContain("Usage: command-template hello");
	expect(output.stdout).toContain("--name <name>");
});

test("dispatch prints group help from help subcommand", async () => {
	const output = await captureProcessOutput(async () => {
		await runCommandTemplateCli(["help", "project"], process.cwd());
	});
	expect(output.stdout).toContain("Usage: command-template project");
	expect(output.stdout).toContain("version");
});

test("dispatch prints version from global option", async () => {
	const output = await captureProcessOutput(async () => {
		await runCommandTemplateCli(["--version"], process.cwd());
	});
	expect(output.stdout).toMatch(/\d+\.\d+\.\d+/);
});

test("dispatch throws usage error for unknown command", async () => {
	try {
		await runCommandTemplateCli(["wat"], process.cwd());
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
		await runCommandTemplateCli(["hello", "--json"], process.cwd());
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
		await runCommandTemplateCli(["hello", "--name", "   "], process.cwd());
		throw new Error("Expected usage error.");
	} catch (error) {
		if (!(error instanceof TemplateError)) {
			throw error;
		}
		expect(error.exitCode).toBe(2);
		expect(error.message).toContain("Invalid options for command: hello");
	}
});
