import { z } from "zod";

import { defineCommand } from "../core/command-definition.ts";
import { stopDaemon } from "../runtime/daemon-host.ts";
import { printCommandResult } from "../runtime/output.ts";

export const daemonStopCommand = defineCommand({
	path: ["daemon", "stop"],
	description: "Stop the daemon.",
	optionsSchema: z.object({}),
	run: async ({ commandPath, globals }) => {
		await stopDaemon();
		printCommandResult({
			commandPath,
			globals,
			text: "Daemon stopped.",
			data: {
				running: false,
			},
		});
	},
});
