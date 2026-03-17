import { z } from "zod";

import { defineCommand } from "../core/command-definition.ts";
import { startDaemon } from "../runtime/daemon-host.ts";

export const daemonStartCommand = defineCommand({
	path: ["daemon", "start"],
	description: "Start the daemon.",
	optionsSchema: z.object({}),
	run: async () => {
		await startDaemon();
		console.log("Daemon started.");
	},
});
