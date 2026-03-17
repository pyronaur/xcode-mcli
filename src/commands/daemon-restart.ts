import { z } from "zod";

import { defineCommand } from "../core/command-definition.ts";
import { restartDaemon } from "../runtime/daemon-host.ts";

export const daemonRestartCommand = defineCommand({
	path: ["daemon", "restart"],
	description: "Restart the daemon.",
	optionsSchema: z.object({}),
	run: async () => {
		await restartDaemon();
		console.log("Daemon restarted.");
	},
});
