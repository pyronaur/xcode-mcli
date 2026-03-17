import { z } from "zod";

import { defineCommand } from "../core/command-definition.ts";
import { callDaemonTool } from "../runtime/daemon-host.ts";
import {
	printCommandResult,
	printVerboseTool,
	toCommandData,
} from "../runtime/output.ts";
import { resolveTabIdentifier } from "../runtime/tab-resolver.ts";

const projectBuildOptionsSchema = z.object({
	tabIdentifier: z.string().trim().min(1).optional(),
});
const projectBuildResultSchema = z.object({
	structuredContent: z.unknown().optional(),
	text: z.string().default(""),
});

export const projectBuildCommand = defineCommand({
	path: ["project", "build"],
	description: "Build the active Xcode project.",
	configure: (command) => {
		command.option("--tab-identifier <id>", "Active Xcode window tab identifier.");
	},
	optionsSchema: projectBuildOptionsSchema,
	run: async ({ commandPath, globals, options }) => {
		const tabIdentifier = await resolveTabIdentifier({
			explicitTabIdentifier: options.tabIdentifier,
		});
		printVerboseTool(globals, "BuildProject");
		const result = projectBuildResultSchema.parse(
			await callDaemonTool({
				name: "BuildProject",
				arguments: {
					tabIdentifier,
				},
			}),
		);
		printCommandResult({
			commandPath,
			globals,
			text: result.text.trimEnd(),
			data: toCommandData(result),
			tabIdentifier,
			tool: "BuildProject",
		});
	},
});
