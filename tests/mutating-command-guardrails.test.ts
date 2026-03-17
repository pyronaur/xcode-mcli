import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { expect, test } from "vitest";

import { runXcodeMcli } from "../src/core/command-dispatch.ts";
import { TemplateError } from "../src/core/errors.ts";
import { runCommandWithFakeBridge } from "./helpers/fake-command-run.ts";

const okTextResult = {
	content: [
		{
			type: "text",
			text: "ok\n",
		},
	],
};

test.each([
	{
		name: "files rm requires explicit confirmation",
		args: ["files", "rm", "--tab-identifier", "windowtab1", "--path", "App/Main.swift"],
		message: "Command requires --yes: files rm",
	},
	{
		name: "files update requires explicit confirmation",
		args: [
			"files",
			"update",
			"--tab-identifier",
			"windowtab1",
			"--file-path",
			"App/Main.swift",
			"--old-string",
			"old",
			"--new-string",
			"new",
		],
		message: "Command requires --yes: files update",
	},
	{
		name: "files write requires explicit confirmation",
		args: [
			"files",
			"write",
			"--tab-identifier",
			"windowtab1",
			"--file-path",
			"App/Main.swift",
			"--content",
			"let x = 1\n",
		],
		message: "Command requires --yes: files write",
	},
	{
		name: "files mv overwrite requires explicit confirmation",
		args: [
			"files",
			"mv",
			"--tab-identifier",
			"windowtab1",
			"--source-path",
			"App/Main.swift",
			"--destination-path",
			"App/Renamed.swift",
			"--overwrite-existing",
		],
		message: "Command requires --yes: files mv --overwrite-existing",
	},
])("$name", async ({ args, message }) => {
	try {
		await runXcodeMcli(args, process.cwd());
		throw new Error("Expected runtime error.");
	} catch (error) {
		if (!(error instanceof TemplateError)) {
			throw error;
		}
		expect(error.message).toBe(message);
	}
});

test("files mkdir forwards directory path and tab identifier", async () => {
	const result = await runCommandWithFakeBridge({
		args: [
			"files",
			"mkdir",
			"--tab-identifier",
			"windowtab1",
			"--directory-path",
			"App/NewGroup",
		],
		tools: [
			{
				name: "XcodeMakeDir",
				inputSchema: {
					type: "object",
					properties: {},
				},
			},
		],
		callResults: {
			XcodeMakeDir: okTextResult,
		},
	});
	expect(result.calls).toEqual([
		{
			name: "XcodeMakeDir",
			arguments: {
				tabIdentifier: "windowtab1",
				directoryPath: "App/NewGroup",
			},
		},
	]);
});

test("files mv forwards overwrite confirmation and operation", async () => {
	const result = await runCommandWithFakeBridge({
		args: [
			"files",
			"mv",
			"--tab-identifier",
			"windowtab1",
			"--source-path",
			"App/Main.swift",
			"--destination-path",
			"App/Renamed.swift",
			"--operation",
			"move",
			"--overwrite-existing",
			"--yes",
		],
		tools: [
			{
				name: "XcodeMV",
				inputSchema: {
					type: "object",
					properties: {},
				},
			},
		],
		callResults: {
			XcodeMV: okTextResult,
		},
	});
	expect(result.calls).toEqual([
		{
			name: "XcodeMV",
			arguments: {
				tabIdentifier: "windowtab1",
				sourcePath: "App/Main.swift",
				destinationPath: "App/Renamed.swift",
				operation: "move",
				overwriteExisting: true,
				yes: true,
			},
		},
	]);
});

test("files rm forwards recursive and delete-files after confirmation", async () => {
	const result = await runCommandWithFakeBridge({
		args: [
			"files",
			"rm",
			"--tab-identifier",
			"windowtab1",
			"--path",
			"App/Main.swift",
			"--recursive",
			"--delete-files",
			"--yes",
		],
		tools: [
			{
				name: "XcodeRM",
				inputSchema: {
					type: "object",
					properties: {},
				},
			},
		],
		callResults: {
			XcodeRM: okTextResult,
		},
	});
	expect(result.calls).toEqual([
		{
			name: "XcodeRM",
			arguments: {
				tabIdentifier: "windowtab1",
				path: "App/Main.swift",
				recursive: true,
				deleteFiles: true,
				yes: true,
			},
		},
	]);
});

test("files update forwards replacement arguments after confirmation", async () => {
	const result = await runCommandWithFakeBridge({
		args: [
			"files",
			"update",
			"--tab-identifier",
			"windowtab1",
			"--file-path",
			"App/Main.swift",
			"--old-string",
			"old",
			"--new-string",
			"new",
			"--replace-all",
			"--yes",
		],
		tools: [
			{
				name: "XcodeUpdate",
				inputSchema: {
					type: "object",
					properties: {},
				},
			},
		],
		callResults: {
			XcodeUpdate: okTextResult,
		},
	});
	expect(result.calls).toEqual([
		{
			name: "XcodeUpdate",
			arguments: {
				tabIdentifier: "windowtab1",
				filePath: "App/Main.swift",
				oldString: "old",
				newString: "new",
				replaceAll: true,
				yes: true,
			},
		},
	]);
});

test("files write loads content from a file after confirmation", async () => {
	const workspace = await mkdtemp(join(tmpdir(), "xcode-mcli-write-content-"));
	const contentFile = join(workspace, "input.swift");
	await writeFile(contentFile, "let answer = 42\n");
	const result = await runCommandWithFakeBridge({
		args: [
			"files",
			"write",
			"--tab-identifier",
			"windowtab1",
			"--file-path",
			"App/Main.swift",
			"--content-file",
			contentFile,
			"--yes",
		],
		tools: [
			{
				name: "XcodeWrite",
				inputSchema: {
					type: "object",
					properties: {},
				},
			},
		],
		callResults: {
			XcodeWrite: okTextResult,
		},
	});
	expect(result.calls).toEqual([
		{
			name: "XcodeWrite",
			arguments: {
				tabIdentifier: "windowtab1",
				filePath: "App/Main.swift",
				content: "let answer = 42\n",
			},
		},
	]);
});
