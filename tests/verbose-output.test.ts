import { expect, test } from "vitest";

import { runCliProcess } from "./helpers/cli-process.ts";
import { createFakeXcrunEnvironment } from "./helpers/fake-xcrun.ts";

test("cli prints the exact Xcode tool name to stderr in verbose JSON mode", async () => {
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
	try {
		const result = await runCliProcess({
			args: ["windows", "list", "--json", "--verbose"],
			env: {
				XCODE_MCLI_STATE_ROOT: environment.stateRoot,
				XCODE_MCLI_XCRUN_PATH: environment.xcrunPath,
			},
		});
		expect(result.exitCode).toBe(0);
		expect(JSON.parse(result.stdout)).toEqual({
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
		expect(result.stderr.trim()).toBe("Xcode MCP tool: XcodeListWindows");
	} finally {
		await runCliProcess({
			args: ["daemon", "stop"],
			env: {
				XCODE_MCLI_STATE_ROOT: environment.stateRoot,
				XCODE_MCLI_XCRUN_PATH: environment.xcrunPath,
			},
		});
	}
});
