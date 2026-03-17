import { mkdir } from "node:fs/promises";
import { z } from "zod";

import { defineCommand } from "../core/command-definition.ts";
import { resolveStateRoot } from "../runtime/env.ts";
import { printCommandResult } from "../runtime/output.ts";
import { findMcpbridgePath, verifyMcpbridgeHelp } from "../runtime/xcrun.ts";

export const setupCommand = defineCommand({
	path: ["setup"],
	description: "Prepare xcode-mcli for use with Xcode MCP.",
	optionsSchema: z.object({}),
	run: async ({ commandPath, globals }) => {
		await mkdir(resolveStateRoot(), { recursive: true });
		await findMcpbridgePath();
		await verifyMcpbridgeHelp();
		printCommandResult({
			commandPath,
			globals,
			text: "xcode-mcli setup complete.",
			data: {
				message: "xcode-mcli setup complete.",
			},
		});
	},
});
