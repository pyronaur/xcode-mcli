import { z } from "zod";

import { defineCommand } from "../core/command-definition.ts";
import { callDaemonTool } from "../runtime/daemon-host.ts";

const windowsListResultSchema = z.object({
	text: z.string().default(""),
});

export const windowsListCommand = defineCommand({
	path: ["windows", "list"],
	description: "List open Xcode windows.",
	optionsSchema: z.object({}),
	run: async () => {
		const result = windowsListResultSchema.parse(
			await callDaemonTool({
				name: "XcodeListWindows",
				arguments: {},
			}),
		);
		console.log(result.text.trimEnd());
	},
});
