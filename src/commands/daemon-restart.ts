import { z } from "zod";

import { defineCommand } from "../core/command-definition.ts";
import { restartDaemon } from "../runtime/daemon-host.ts";
import { printCommandResult } from "../runtime/output.ts";

export const daemonRestartCommand = defineCommand({
	path: ["daemon", "restart"],
	description: "Restart the daemon.",
	optionsSchema: z.object({}),
	run: async ({ commandPath, globals }) => {
		await restartDaemon();
		printCommandResult({
			commandPath,
			globals,
			text: "Daemon restarted.",
			data: {
				running: true,
			},
		});
	},
});
