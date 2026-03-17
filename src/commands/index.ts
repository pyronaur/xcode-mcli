import { daemonStartCommand } from "./daemon-start.ts";
import { daemonStatusCommand } from "./daemon-status.ts";
import { daemonStopCommand } from "./daemon-stop.ts";
import { setupCommand } from "./setup.ts";
import { windowsUseCommand } from "./windows-use.ts";

export const commandDefinitions = [
	setupCommand,
	daemonStartCommand,
	daemonStatusCommand,
	daemonStopCommand,
	windowsUseCommand,
];
