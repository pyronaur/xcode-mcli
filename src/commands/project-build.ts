import { z } from "zod";

import { defineToolCommand } from "../core/command-definition.ts";
import { tabIdentifierOptionDescription } from "../core/help-text.ts";
import {
	printCommandResult,
	toCommandData,
} from "../runtime/output.ts";
import { resolveTabIdentifier } from "../runtime/tab-resolver.ts";

const projectBuildOptionsSchema = z.object({
	tabIdentifier: z.string().trim().min(1).optional(),
});

export const projectBuildCommand = defineToolCommand({
	path: ["project", "build"],
	description: "Build the active Xcode project.",
	toolName: "BuildProject",
	configure: (command) => {
		command.option("--tab-identifier <id>", tabIdentifierOptionDescription);
	},
	optionsSchema: projectBuildOptionsSchema,
	buildArguments: async ({ options }) => ({
		tabIdentifier: await resolveTabIdentifier({
			explicitTabIdentifier: options.tabIdentifier,
		}),
	}),
	run: async ({ commandPath, globals, toolArguments }, result) => {
		printCommandResult({
			commandPath,
			globals,
			text: result.text.trimEnd(),
			data: toCommandData(result),
			tabIdentifier: toolArguments.tabIdentifier,
			tool: "BuildProject",
		});
	},
});
