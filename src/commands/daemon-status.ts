import { z } from "zod";

import { defineCommand } from "../core/command-definition.ts";
import { readDaemonStatus } from "../runtime/daemon-status.ts";

export const daemonStatusCommand = defineCommand({
	path: ["daemon", "status"],
	description: "Show daemon status.",
	optionsSchema: z.object({}),
	run: async () => {
		const status = await readDaemonStatus();
		if (!status.running) {
			console.log("Daemon is not running.");
			return;
		}
		console.log(`Daemon is running with PID ${status.pid}.`);
	},
});
