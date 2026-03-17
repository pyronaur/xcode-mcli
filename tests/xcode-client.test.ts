import { expect, test } from "vitest";

import { createXcodeBridgeClient } from "../src/runtime/xcode-client.ts";
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
