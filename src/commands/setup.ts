import { mkdir } from "node:fs/promises";
import { z } from "zod";

import { defineCommand } from "../core/command-definition.ts";
import { resolveStateRoot } from "../runtime/env.ts";
import { findMcpbridgePath, verifyMcpbridgeHelp } from "../runtime/xcrun.ts";

export const setupCommand = defineCommand({
	path: ["setup"],
	description: "Prepare xcode-mcli for use with Xcode MCP.",
	optionsSchema: z.object({}),
	run: async () => {
		await mkdir(resolveStateRoot(), { recursive: true });
		await findMcpbridgePath();
		await verifyMcpbridgeHelp();
		console.log("xcode-mcli setup complete.");
	},
});
