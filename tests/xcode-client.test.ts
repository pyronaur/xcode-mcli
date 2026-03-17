import { expect, test } from "vitest";

import {
	createXcodeBridgeClient,
	readXcodeMcpSurface,
} from "../src/runtime/xcode-client.ts";
import { createFakeXcrunEnvironment } from "./helpers/fake-xcrun.ts";

test("xcode bridge client initializes and calls Xcode tools over stdio JSON-RPC", async () => {
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
				structuredContent: {
					windows: [
						{
							tabIdentifier: "windowtab1",
							workspacePath: "/tmp/Countdown.xcworkspace",
						},
					],
				},
				content: [
					{
						type: "text",
						text: "* tabIdentifier: windowtab1, workspacePath: /tmp/Countdown.xcworkspace\n",
					},
				],
			},
		},
	});
	process.env.XCODE_MCLI_XCRUN_PATH = environment.xcrunPath;
	try {
		const client = await createXcodeBridgeClient();
		expect(await client.listTools()).toEqual([
			expect.objectContaining({
				name: "XcodeListWindows",
			}),
		]);
		expect(await client.callTool({ name: "XcodeListWindows", arguments: {} })).toEqual(
			expect.objectContaining({
				structuredContent: {
					windows: [
						{
							tabIdentifier: "windowtab1",
							workspacePath: "/tmp/Countdown.xcworkspace",
						},
					],
				},
				text: "* tabIdentifier: windowtab1, workspacePath: /tmp/Countdown.xcworkspace\n",
			}),
		);
		await client.close();
	} finally {
		delete process.env.XCODE_MCLI_XCRUN_PATH;
	}
});

test("xcode surface discovery captures tools, prompts, resources, and protocol version", async () => {
	const environment = await createFakeXcrunEnvironment({
		tools: [
			{
				name: "XcodeListWindows",
				description: "List windows.",
				inputSchema: {
					type: "object",
					properties: {},
				},
				outputSchema: {
					type: "object",
					properties: {
						windows: {
							type: "array",
						},
					},
				},
			},
		],
		prompts: [
			{
				name: "repair_build",
				description: "Suggest fixes for the latest build.",
				arguments: [
					{
						name: "severity",
						required: false,
					},
				],
			},
		],
		resources: [
			{
				name: "active_workspace",
				description: "Current workspace context.",
				uri: "xcode://workspace/active",
			},
		],
	});
	process.env.XCODE_MCLI_XCRUN_PATH = environment.xcrunPath;
	try {
		expect(await readXcodeMcpSurface()).toEqual({
			protocolVersion: "2025-06-18",
			prompts: [
				{
					arguments: [
						{
							name: "severity",
							required: false,
						},
					],
					description: "Suggest fixes for the latest build.",
					name: "repair_build",
				},
			],
			resources: [
				{
					description: "Current workspace context.",
					name: "active_workspace",
					uri: "xcode://workspace/active",
				},
			],
			tools: [
				{
					description: "List windows.",
					inputSchema: {
						properties: {},
						type: "object",
					},
					name: "XcodeListWindows",
					outputSchema: {
						properties: {
							windows: {
								type: "array",
							},
						},
						type: "object",
					},
				},
			],
		});
	} finally {
		delete process.env.XCODE_MCLI_XCRUN_PATH;
	}
});
