import { z } from "zod";

import { defineCommand } from "../core/command-definition.ts";
import { stopDaemon } from "../runtime/daemon-host.ts";

export const daemonStopCommand = defineCommand({
	path: ["daemon", "stop"],
	description: "Stop the daemon.",
	optionsSchema: z.object({}),
	run: async () => {
		await stopDaemon();
		console.log("Daemon stopped.");
	},
});
