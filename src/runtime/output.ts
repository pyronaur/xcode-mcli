import type { GlobalOptions } from "../core/contracts.ts";

type CommandResultInput = {
	commandPath: readonly string[];
	data?: unknown;
	globals: GlobalOptions;
	tabIdentifier?: string;
	text?: string;
	tool?: string;
};

function commandPathToString(commandPath: readonly string[]): string {
	return commandPath.join(" ");
}

type JsonSuccessEnvelope = {
	command: string;
	data: unknown;
	ok: true;
	tabIdentifier?: string;
	tool?: string;
};

function toJsonSuccessEnvelope(input: CommandResultInput): JsonSuccessEnvelope {
	return {
		ok: true,
		command: commandPathToString(input.commandPath),
		data: input.data ?? {},
		tabIdentifier: input.tabIdentifier,
		tool: input.tool,
	};
}

export function printCommandResult(input: CommandResultInput): void {
	if (input.globals.json) {
		console.log(JSON.stringify(toJsonSuccessEnvelope(input)));
		return;
	}
	console.log(input.text ?? "");
}
