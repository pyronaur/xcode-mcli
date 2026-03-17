import { z } from "zod";

import { defineCommand } from "../core/command-definition.ts";
import { readDaemonStatus } from "../runtime/daemon-host.ts";
import { printCommandResult } from "../runtime/output.ts";

export const daemonStatusCommand = defineCommand({
	path: ["daemon", "status"],
	description: "Show daemon status.",
	optionsSchema: z.object({}),
	run: async ({ commandPath, globals }) => {
		const status = await readDaemonStatus();
		printCommandResult({
			commandPath,
			globals,
			text: status.running
				? `Daemon is running with PID ${status.pid}.`
				: "Daemon is not running.",
			data: status.running
				? {
					running: true,
					pid: status.pid,
				}
				: {
					running: false,
				},
		});
	},
});
