import { z } from "zod";

import { defineCommand } from "../core/command-definition.ts";
import { callDaemonTool } from "../runtime/daemon-host.ts";
import {
	printCommandResult,
	printVerboseTool,
	toCommandData,
} from "../runtime/output.ts";

const windowsListResultSchema = z.object({
	structuredContent: z.unknown().optional(),
	text: z.string().default(""),
});

export const windowsListCommand = defineCommand({
	path: ["windows", "list"],
	description: "List open Xcode windows.",
	optionsSchema: z.object({}),
	run: async ({ commandPath, globals }) => {
		printVerboseTool(globals, "XcodeListWindows");
		const result = windowsListResultSchema.parse(
			await callDaemonTool({
				name: "XcodeListWindows",
				arguments: {},
			}),
		);
		printCommandResult({
			commandPath,
			globals,
			text: result.text.trimEnd(),
			data: toCommandData(result),
			tool: "XcodeListWindows",
		});
	},
});
