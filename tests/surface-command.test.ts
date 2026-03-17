import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { expect, test } from "vitest";

import { createFakeXcrunEnvironment } from "./helpers/fake-xcrun.ts";
import { runCliProcess } from "./helpers/cli-process.ts";

test("surface snapshot prints a normalized JSON envelope", async () => {
	const environment = await createFakeXcrunEnvironment({
		tools: [
			{
				name: "BuildProject",
				description: "Build the project.",
				inputSchema: {
					required: ["tabIdentifier"],
					type: "object",
					properties: {
						tabIdentifier: {
							type: "string",
						},
					},
				},
			},
			{
				name: "DocumentationSearch",
				description: "Search docs.",
				inputSchema: {
					type: "object",
					properties: {
						query: {
							type: "string",
						},
					},
					required: ["query"],
				},
			},
		],
		prompts: [
			{
				name: "z_prompt",
				description: "Later prompt.",
			},
			{
				name: "a_prompt",
				description: "Earlier prompt.",
			},
		],
		resources: [
			{
				name: "workspace",
				uri: "xcode://workspace/current",
				description: "Workspace.",
			},
		],
	});
	const result = await runCliProcess({
		args: ["surface", "snapshot", "--json"],
		env: {
			XCODE_MCLI_XCRUN_PATH: environment.xcrunPath,
		},
	});
	expect(result.exitCode).toBe(0);
	expect(result.stderr).toBe("");
	expect(JSON.parse(result.stdout)).toEqual({
		ok: true,
		command: "surface snapshot",
		data: {
			protocolVersion: "2025-06-18",
			prompts: [
				{
					description: "Earlier prompt.",
					name: "a_prompt",
				},
				{
					description: "Later prompt.",
					name: "z_prompt",
				},
			],
			resources: [
				{
					description: "Workspace.",
					name: "workspace",
					uri: "xcode://workspace/current",
				},
			],
			tools: [
				{
					description: "Build the project.",
					inputSchema: {
						properties: {
							tabIdentifier: {
								type: "string",
							},
						},
						required: ["tabIdentifier"],
						type: "object",
					},
					name: "BuildProject",
				},
				{
					description: "Search docs.",
					inputSchema: {
						properties: {
							query: {
								type: "string",
							},
						},
						required: ["query"],
						type: "object",
					},
					name: "DocumentationSearch",
				},
			],
		},
	});
});

test("surface snapshot writes a canonical baseline file", async () => {
	const outputRoot = await mkdtemp(join(tmpdir(), "xcode-mcli-surface-"));
	const outputFile = join(outputRoot, "surface.json");
	const environment = await createFakeXcrunEnvironment({
		tools: [
			{
				name: "XcodeListWindows",
				description: "List windows.",
			},
		],
	});
	const result = await runCliProcess({
		args: ["surface", "snapshot", "--output-file", outputFile],
		env: {
			XCODE_MCLI_XCRUN_PATH: environment.xcrunPath,
		},
	});
	expect(result.exitCode).toBe(0);
	expect(result.stderr).toBe("");
	expect(result.stdout.trim()).toBe(`Wrote Xcode MCP surface snapshot to ${outputFile}`);
	expect(JSON.parse(await readFile(outputFile, "utf8"))).toEqual({
		protocolVersion: "2025-06-18",
		prompts: [],
		resources: [],
		tools: [
			{
				description: "List windows.",
				name: "XcodeListWindows",
			},
		],
	});
});

test("surface verify reports a machine-readable mismatch against the baseline", async () => {
	const outputRoot = await mkdtemp(join(tmpdir(), "xcode-mcli-surface-verify-"));
	const baselineFile = join(outputRoot, "baseline.json");
	await writeFile(
		baselineFile,
		JSON.stringify({
			protocolVersion: "2025-06-18",
			prompts: [],
			resources: [],
			tools: [
				{
					name: "XcodeListWindows",
					description: "List windows.",
				},
			],
		}),
	);
	const environment = await createFakeXcrunEnvironment({
		tools: [
			{
				name: "BuildProject",
				description: "Build project.",
			},
			{
				name: "XcodeListWindows",
				description: "List windows.",
			},
		],
	});
	const result = await runCliProcess({
		args: ["surface", "verify", "--baseline-file", baselineFile, "--json"],
		env: {
			XCODE_MCLI_XCRUN_PATH: environment.xcrunPath,
		},
	});
	expect(result.exitCode).toBe(1);
	expect(result.stderr).toBe("");
	expect(JSON.parse(result.stdout)).toEqual({
		ok: false,
		command: "surface verify",
		tool: undefined,
		error: {
			kind: "runtime",
			message: "Xcode MCP surface does not match the baseline snapshot.",
			details: {
				protocolVersionChanged: false,
				prompts: {
					added: [],
					changed: [],
					removed: [],
				},
				resources: {
					added: [],
					changed: [],
					removed: [],
				},
				tools: {
					added: ["BuildProject"],
					changed: [],
					removed: [],
				},
			},
		},
	});
});
