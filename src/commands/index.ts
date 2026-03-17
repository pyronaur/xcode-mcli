import { daemonStatusCommand } from "./daemon-status.ts";
import { setupCommand } from "./setup.ts";
import { windowsUseCommand } from "./windows-use.ts";

export const commandDefinitions = [
	setupCommand,
	daemonStatusCommand,
	windowsUseCommand,
];
