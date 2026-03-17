import { z } from "zod";

import { defineCommand } from "../core/command-definition.ts";
import { callDaemonTool } from "../runtime/daemon-host.ts";
import {
	printCommandResult,
	printVerboseTool,
	toCommandData,
} from "../runtime/output.ts";
import {
	readWindowsFromToolResult,
	xcodeWindowsToolResultSchema,
} from "../runtime/xcode-windows.ts";

export const windowsListCommand = defineCommand({
	path: ["windows", "list"],
	description: "List open Xcode windows.",
	toolName: "XcodeListWindows",
	optionsSchema: z.object({}),
	run: async ({ commandPath, globals }) => {
		printVerboseTool(globals, "XcodeListWindows");
		const result = xcodeWindowsToolResultSchema.parse(
			await callDaemonTool({
				name: "XcodeListWindows",
				arguments: {},
			}),
		);
		const windows = readWindowsFromToolResult(result);
		printCommandResult({
			commandPath,
			globals,
			text: result.text.trimEnd(),
			data: windows.length > 0
				? {
					windows,
				}
				: toCommandData(result),
			tool: "XcodeListWindows",
		});
	},
});
