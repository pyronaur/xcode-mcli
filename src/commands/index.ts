import type { CommandDefinition } from "../core/contracts.ts";
import { daemonRestartCommand } from "./daemon-restart.ts";
import { daemonStartCommand } from "./daemon-start.ts";
import { daemonStatusCommand } from "./daemon-status.ts";
import { daemonStopCommand } from "./daemon-stop.ts";
import { projectBuildCommand } from "./project-build.ts";
import { setupCommand } from "./setup.ts";
import { windowsListCommand } from "./windows-list.ts";
import { windowsUseCommand } from "./windows-use.ts";
import { xcodeToolCommandDefinitions } from "./xcode-tool-commands.ts";

export const commandDefinitions: CommandDefinition[] = [
	setupCommand,
	daemonStartCommand,
	daemonRestartCommand,
	daemonStatusCommand,
	daemonStopCommand,
	projectBuildCommand,
	windowsListCommand,
	windowsUseCommand,
	...xcodeToolCommandDefinitions,
];
