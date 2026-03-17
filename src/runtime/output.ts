import { EXIT_USAGE_ERROR } from "../constants.ts";
import type { GlobalOptions } from "../core/contracts.ts";
import type { TemplateError } from "../core/errors.ts";

type CommandResultInput = {
	commandPath: readonly string[];
	data?: unknown;
	globals: GlobalOptions;
	tabIdentifier?: string;
	text?: string;
	tool?: string;
};

type CommandErrorInput = {
	argv: string[];
	error: TemplateError;
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

const GLOBAL_BOOLEAN_FLAGS = new Set(["--help", "--json", "--verbose", "--version"]);
const GLOBAL_VALUE_FLAGS = new Set(["--tab-identifier"]);

function toJsonSuccessEnvelope(input: CommandResultInput): JsonSuccessEnvelope {
	return {
		ok: true,
		command: commandPathToString(input.commandPath),
		data: input.data ?? {},
		tabIdentifier: input.tabIdentifier,
		tool: input.tool,
	};
}

function readGlobalOptionsFromArgv(argv: string[]): GlobalOptions {
	return {
		json: argv.includes("--json"),
		verbose: argv.includes("--verbose"),
	};
}

function readCommandNameFromArgv(argv: string[]): string {
	const commandTokens: string[] = [];
	let reachedCommand = false;
	for (let index = 0; index < argv.length; index += 1) {
		const token = argv[index];
		if (typeof token !== "string") {
			break;
		}
		if (!reachedCommand && GLOBAL_BOOLEAN_FLAGS.has(token)) {
			continue;
		}
		if (!reachedCommand && GLOBAL_VALUE_FLAGS.has(token)) {
			index += 1;
			continue;
		}
		if (token.startsWith("-")) {
			break;
		}
		reachedCommand = true;
		commandTokens.push(token);
	}
	return commandTokens.join(" ");
}

function readErrorKind(error: TemplateError): "runtime" | "usage" {
	return error.exitCode === EXIT_USAGE_ERROR ? "usage" : "runtime";
}

export function toCommandData(input: {
	structuredContent?: unknown;
	text?: string;
}): unknown {
	if (input.structuredContent !== undefined) {
		return input.structuredContent;
	}
	const text = input.text?.trimEnd() ?? "";
	if (text.length > 0) {
		return {
			text,
		};
	}
	return {};
}

export function printVerboseTool(globals: GlobalOptions, toolName: string): void {
	if (!globals.verbose) {
		return;
	}
	console.error(`Xcode MCP tool: ${toolName}`);
}

export function printCommandResult(input: CommandResultInput): void {
	if (input.globals.json) {
		console.log(JSON.stringify(toJsonSuccessEnvelope(input)));
		return;
	}
	console.log(input.text ?? "");
}

export function printCommandError(input: CommandErrorInput): void {
	const globals = readGlobalOptionsFromArgv(input.argv);
	if (!globals.json) {
		console.error(input.error.message);
		return;
	}
	console.log(
		JSON.stringify({
			ok: false,
			command: input.error.commandName ?? readCommandNameFromArgv(input.argv),
			tool: input.error.toolName,
			error: {
				kind: readErrorKind(input.error),
				message: input.error.message,
			},
		}),
	);
}
