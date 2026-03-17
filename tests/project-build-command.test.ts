import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { expect, test } from "vitest";

import { runXcodeMcli } from "../src/core/command-dispatch.ts";
import { captureConsoleLogs } from "./helpers/console.ts";
import { createFakeXcrunEnvironment } from "./helpers/fake-xcrun.ts";

test("project build auto-resolves the single Xcode window tab before calling BuildProject", async () => {
	const environment = await createFakeXcrunEnvironment({
		tools: [
			{
				name: "XcodeListWindows",
				description: "List windows.",
				inputSchema: {
					type: "object",
					properties: {},
				},
			},
			{
				name: "BuildProject",
				description: "Build project.",
				inputSchema: {
					type: "object",
					properties: {
						tabIdentifier: {
							type: "string",
						},
					},
				},
			},
		],
		callResults: {
			XcodeListWindows: {
				content: [
					{
						type: "text",
						text: "* tabIdentifier: windowtab1, workspacePath: /tmp/Countdown.xcworkspace\n",
					},
				],
				structuredContent: {
					windows: [
						{
							tabIdentifier: "windowtab1",
							workspacePath: "/tmp/Countdown.xcworkspace",
						},
					],
				},
			},
			BuildProject: {
				content: [
					{
						type: "text",
						text: "Build succeeded.\n",
					},
				],
			},
		},
	});
	process.env.XCODE_MCLI_STATE_ROOT = environment.stateRoot;
	process.env.XCODE_MCLI_XCRUN_PATH = environment.xcrunPath;
	try {
		const lines = await captureConsoleLogs(async () => {
			await runXcodeMcli(["project", "build"], process.cwd());
		});
		expect(lines).toEqual(["Build succeeded."]);
	} finally {
		await runXcodeMcli(["daemon", "stop"], process.cwd());
		delete process.env.XCODE_MCLI_STATE_ROOT;
		delete process.env.XCODE_MCLI_XCRUN_PATH;
	}
});

test("project build prints a stable JSON envelope", async () => {
	const environment = await createFakeXcrunEnvironment({
		tools: [
			{
				name: "XcodeListWindows",
				description: "List windows.",
				inputSchema: {
					type: "object",
					properties: {},
				},
			},
			{
				name: "BuildProject",
				description: "Build project.",
				inputSchema: {
					type: "object",
					properties: {
						tabIdentifier: {
							type: "string",
						},
					},
				},
			},
		],
		callResults: {
			XcodeListWindows: {
				content: [
					{
						type: "text",
						text: "* tabIdentifier: windowtab1, workspacePath: /tmp/Countdown.xcworkspace\n",
					},
				],
				structuredContent: {
					windows: [
						{
							tabIdentifier: "windowtab1",
							workspacePath: "/tmp/Countdown.xcworkspace",
						},
					],
				},
			},
			BuildProject: {
				content: [
					{
						type: "text",
						text: "Build succeeded.\n",
					},
				],
			},
		},
	});
	process.env.XCODE_MCLI_STATE_ROOT = environment.stateRoot;
	process.env.XCODE_MCLI_XCRUN_PATH = environment.xcrunPath;
	try {
		const lines = await captureConsoleLogs(async () => {
			await runXcodeMcli(["project", "build", "--json"], process.cwd());
		});
		expect(lines).toHaveLength(1);
		expect(JSON.parse(lines[0] ?? "")).toEqual({
			ok: true,
			command: "project build",
			tool: "BuildProject",
			tabIdentifier: "windowtab1",
			data: {
				text: "Build succeeded.",
			},
		});
	} finally {
		await runXcodeMcli(["daemon", "stop"], process.cwd());
		delete process.env.XCODE_MCLI_STATE_ROOT;
		delete process.env.XCODE_MCLI_XCRUN_PATH;
	}
});

test("project build accepts a global tab identifier before the subcommand", async () => {
	const eventLogPath = join(
		await mkdtemp(join(tmpdir(), "xcode-mcli-project-build-global-tab-")),
		"events.log",
	);
	const environment = await createFakeXcrunEnvironment({
		eventLogPath,
		tools: [
			{
				name: "BuildProject",
				description: "Build project.",
				inputSchema: {
					type: "object",
					properties: {
						tabIdentifier: {
							type: "string",
						},
					},
				},
			},
		],
		callResults: {
			BuildProject: {
				content: [
					{
						type: "text",
						text: "Build succeeded.\n",
					},
				],
			},
		},
	});
	process.env.XCODE_MCLI_STATE_ROOT = environment.stateRoot;
	process.env.XCODE_MCLI_XCRUN_PATH = environment.xcrunPath;
	try {
		const lines = await captureConsoleLogs(async () => {
			await runXcodeMcli(
				["--tab-identifier", "windowtab1", "project", "build", "--json"],
				process.cwd(),
			);
		});
		expect(JSON.parse(lines[0] ?? "")).toEqual({
			ok: true,
			command: "project build",
			tool: "BuildProject",
			tabIdentifier: "windowtab1",
			data: {
				text: "Build succeeded.",
			},
		});
		const eventLog = await readFile(eventLogPath, "utf8");
		expect(eventLog).toContain('call:BuildProject:{"tabIdentifier":"windowtab1"}');
	} finally {
		await runXcodeMcli(["daemon", "stop"], process.cwd());
		delete process.env.XCODE_MCLI_STATE_ROOT;
		delete process.env.XCODE_MCLI_XCRUN_PATH;
	}
});

test("project build auto-resolves wrapped window text from XcodeListWindows", async () => {
	const environment = await createFakeXcrunEnvironment({
		tools: [
			{
				name: "XcodeListWindows",
				description: "List windows.",
				inputSchema: {
					type: "object",
					properties: {},
				},
			},
			{
				name: "BuildProject",
				description: "Build project.",
				inputSchema: {
					type: "object",
					properties: {
						tabIdentifier: {
							type: "string",
						},
					},
				},
			},
		],
		callResults: {
			XcodeListWindows: {
				content: [
					{
						type: "text",
						text: "{\"message\":\"* tabIdentifier: windowtab1, workspacePath: /tmp/Countdown.xcworkspace\\n\"}",
					},
				],
			},
			BuildProject: {
				content: [
					{
						type: "text",
						text: "Build succeeded.\n",
					},
				],
			},
		},
	});
	process.env.XCODE_MCLI_STATE_ROOT = environment.stateRoot;
	process.env.XCODE_MCLI_XCRUN_PATH = environment.xcrunPath;
	try {
		const lines = await captureConsoleLogs(async () => {
			await runXcodeMcli(["project", "build"], process.cwd());
		});
		expect(lines).toEqual(["Build succeeded."]);
	} finally {
		await runXcodeMcli(["daemon", "stop"], process.cwd());
		delete process.env.XCODE_MCLI_STATE_ROOT;
		delete process.env.XCODE_MCLI_XCRUN_PATH;
	}
});
