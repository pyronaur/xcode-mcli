import { z } from "zod";

import { defineToolCommand } from "../core/command-definition.ts";
import { setLastSeenWindows } from "../runtime/daemon-state.ts";
import {
	printCommandResult,
	toCommandData,
} from "../runtime/output.ts";
import { readWindowsFromToolResult } from "../runtime/xcode-windows.ts";

export const windowsListCommand = defineToolCommand({
	path: ["windows", "list"],
	description: "List open Xcode windows.",
	toolName: "XcodeListWindows",
	optionsSchema: z.object({}),
	buildArguments: async () => ({}),
	run: async ({ commandPath, globals }, result) => {
		const windows = readWindowsFromToolResult(result);
		await setLastSeenWindows(windows);
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
