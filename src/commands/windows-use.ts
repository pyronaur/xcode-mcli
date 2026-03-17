import { z } from "zod";

import { defineCommand } from "../core/command-definition.ts";
import { setActiveTabIdentifier } from "../runtime/daemon-state.ts";
import { printCommandResult } from "../runtime/output.ts";

const windowsUseOptionsSchema = z.object({
	tabIdentifier: z.string().trim().min(1),
});

export const windowsUseCommand = defineCommand({
	path: ["windows", "use"],
	description: "Select the active Xcode window tab.",
	configure: (command) => {
		command.requiredOption("--tab-identifier <id>", "Active Xcode window tab identifier.");
	},
	optionsSchema: windowsUseOptionsSchema,
	run: async ({ commandPath, globals, options }) => {
		await setActiveTabIdentifier(options.tabIdentifier);
		printCommandResult({
			commandPath,
			globals,
			text: `Active Xcode tab set to ${options.tabIdentifier}.`,
			tabIdentifier: options.tabIdentifier,
			data: {
				tabIdentifier: options.tabIdentifier,
			},
		});
	},
});
