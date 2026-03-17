import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { expect, test } from "vitest";

import { runXcodeMcli } from "../src/core/command-dispatch.ts";
import { captureConsoleLogs } from "./helpers/console.ts";
import { createFakeXcrunEnvironment } from "./helpers/fake-xcrun.ts";

test("windows list reuses one daemon-backed bridge session across repeated calls", async () => {
	const workspace = await mkdtemp(join(tmpdir(), "xcode-mcli-windows-list-"));
	const eventLogPath = join(workspace, "events.log");
	const environment = await createFakeXcrunEnvironment({
		eventLogPath,
		tools: [
			{
				name: "XcodeListWindows",
				description: "List windows.",
				inputSchema: {
					type: "object",
					properties: {},
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
		},
	});
	process.env.XCODE_MCLI_STATE_ROOT = environment.stateRoot;
	process.env.XCODE_MCLI_XCRUN_PATH = environment.xcrunPath;
	try {
		const firstLines = await captureConsoleLogs(async () => {
			await runXcodeMcli(["windows", "list"], process.cwd());
		});
		const secondLines = await captureConsoleLogs(async () => {
			await runXcodeMcli(["windows", "list"], process.cwd());
		});
		expect(firstLines).toEqual([
			"* tabIdentifier: windowtab1, workspacePath: /tmp/Countdown.xcworkspace",
		]);
		expect(secondLines).toEqual([
			"* tabIdentifier: windowtab1, workspacePath: /tmp/Countdown.xcworkspace",
		]);
		const log = await readFile(eventLogPath, "utf8");
		expect(log.match(/^startup:/gm)).toHaveLength(1);
	} finally {
		await runXcodeMcli(["daemon", "stop"], process.cwd());
		delete process.env.XCODE_MCLI_STATE_ROOT;
		delete process.env.XCODE_MCLI_XCRUN_PATH;
	}
});

test("windows list prints a stable JSON envelope", async () => {
	await mkdtemp(join(tmpdir(), "xcode-mcli-windows-json-"));
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
		},
	});
	process.env.XCODE_MCLI_STATE_ROOT = environment.stateRoot;
	process.env.XCODE_MCLI_XCRUN_PATH = environment.xcrunPath;
	try {
		const lines = await captureConsoleLogs(async () => {
			await runXcodeMcli(["windows", "list", "--json"], process.cwd());
		});
		expect(lines).toHaveLength(1);
		expect(JSON.parse(lines[0] ?? "")).toEqual({
			ok: true,
			command: "windows list",
			tool: "XcodeListWindows",
			data: {
				windows: [
					{
						tabIdentifier: "windowtab1",
						workspacePath: "/tmp/Countdown.xcworkspace",
					},
				],
			},
		});
	} finally {
		await runXcodeMcli(["daemon", "stop"], process.cwd());
		delete process.env.XCODE_MCLI_STATE_ROOT;
		delete process.env.XCODE_MCLI_XCRUN_PATH;
	}
});

test("windows list normalizes wrapped message text into structured windows", async () => {
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
		},
	});
	process.env.XCODE_MCLI_STATE_ROOT = environment.stateRoot;
	process.env.XCODE_MCLI_XCRUN_PATH = environment.xcrunPath;
	try {
		const lines = await captureConsoleLogs(async () => {
			await runXcodeMcli(["windows", "list", "--json"], process.cwd());
		});
		expect(lines).toHaveLength(1);
		expect(JSON.parse(lines[0] ?? "")).toEqual({
			ok: true,
			command: "windows list",
			tool: "XcodeListWindows",
			data: {
				windows: [
					{
						tabIdentifier: "windowtab1",
						workspacePath: "/tmp/Countdown.xcworkspace",
					},
				],
			},
		});
	} finally {
		await runXcodeMcli(["daemon", "stop"], process.cwd());
		delete process.env.XCODE_MCLI_STATE_ROOT;
		delete process.env.XCODE_MCLI_XCRUN_PATH;
	}
});
