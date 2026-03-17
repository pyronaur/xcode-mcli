import { z } from "zod";

import { defineCommand } from "../core/command-definition.ts";
import { startDaemon } from "../runtime/daemon-host.ts";
import { printCommandResult } from "../runtime/output.ts";

export const daemonStartCommand = defineCommand({
	path: ["daemon", "start"],
	description: "Start the daemon.",
	optionsSchema: z.object({}),
	run: async ({ commandPath, globals }) => {
		await startDaemon();
		printCommandResult({
			commandPath,
			globals,
			text: "Daemon started.",
			data: {
				running: true,
			},
		});
	},
});
