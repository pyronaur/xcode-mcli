import type { Command } from "commander";
import { readFile } from "node:fs/promises";
import { z } from "zod";

import { defineToolCommand } from "../core/command-definition.ts";
import { runtimeError } from "../core/errors.ts";
import { tabIdentifierOptionDescription } from "../core/help-text.ts";
import {
	printCommandResult,
	toCommandData,
} from "../runtime/output.ts";
import { resolveTabIdentifier } from "../runtime/tab-resolver.ts";
import type {
	ToolCallResult,
	ToolName,
} from "../runtime/xcode-tool-contract.ts";

type ToolCommandDefinitionInput<
	K extends ToolName,
	TOptions,
	TArguments extends Record<string, unknown>,
> = {
	buildArguments: (options: TOptions) => Promise<TArguments> | TArguments;
	configure?: (command: Command) => void;
	description: string;
	path: readonly [string, ...string[]];
	requiresTab?: boolean;
	toolName: K;
	optionsSchema: z.ZodType<TOptions>;
};

function defaultToolText(result: ToolCallResult<ToolName>): string {
	const text = result.text.trimEnd();
	if (text.length > 0) {
		return text;
	}
	if (result.structuredContent !== undefined) {
		return JSON.stringify(result.structuredContent, null, 2);
	}
	return "";
}

function readTabIdentifierOption(options: unknown): string | undefined {
	if (!options || typeof options !== "object") {
		return undefined;
	}
	if (!("tabIdentifier" in options)) {
		return undefined;
	}
	const candidate = options.tabIdentifier;
	if (typeof candidate !== "string") {
		return undefined;
	}
	return candidate;
}

export function addTabIdentifierOption(command: Command): void {
	command.option("--tab-identifier <id>", tabIdentifierOptionDescription);
}

export function collectRepeatedStrings(
	value: string,
	previous: string[] | undefined,
): string[] {
	return [...(previous ?? []), value];
}

export function parseKeyValuePairs(values: string[]): Record<string, string>[] {
	const result: Record<string, string>[] = [];
	let current: Record<string, string> = {};
	for (const value of values) {
		const separatorIndex = value.indexOf("=");
		if (separatorIndex <= 0) {
			throw runtimeError(`Invalid key=value input: ${value}`);
		}
		const key = value.slice(0, separatorIndex);
		const parsedValue = value.slice(separatorIndex + 1);
		current[key] = parsedValue;
		if (current.targetName && current.testIdentifier) {
			result.push(current);
			current = {};
		}
	}
	if (Object.keys(current).length > 0) {
		throw runtimeError("Incomplete test specifier. Expected both targetName and testIdentifier.");
	}
	return result;
}

export async function resolveWriteContent(input: {
	content?: string;
	contentFile?: string;
}): Promise<string> {
	if (typeof input.content === "string") {
		return input.content;
	}
	if (typeof input.contentFile === "string") {
		return readFile(input.contentFile, "utf8");
	}
	throw runtimeError("Expected --content or --content-file.");
}

export function requireYes(
	input: { condition: boolean; commandName: string; yes?: boolean },
): void {
	if (input.condition && input.yes) {
		return;
	}
	if (input.condition) {
		throw runtimeError(`Command requires --yes: ${input.commandName}`);
	}
}

export function createToolCommand<
	K extends ToolName,
	TOptions,
	TArguments extends Record<string, unknown>,
>(input: ToolCommandDefinitionInput<K, TOptions, TArguments>) {
	return defineToolCommand({
		path: input.path,
		description: input.description,
		toolName: input.toolName,
		configure: input.configure,
		optionsSchema: input.optionsSchema,
		buildArguments: async ({ options }) => {
			const toolArguments = await input.buildArguments(options);
			const resolvedToolArguments = toolArguments as Record<string, unknown>;
			if (input.requiresTab && typeof resolvedToolArguments.tabIdentifier !== "string") {
				resolvedToolArguments.tabIdentifier = await resolveTabIdentifier({
					explicitTabIdentifier: readTabIdentifierOption(options),
				});
			}
			return toolArguments;
		},
		run: async ({ commandPath, globals, toolArguments }, result) => {
			printCommandResult({
				commandPath,
				globals,
				text: defaultToolText(result),
				data: toCommandData(result),
				tabIdentifier: typeof toolArguments.tabIdentifier === "string"
					? toolArguments.tabIdentifier
					: undefined,
				tool: input.toolName,
			});
		},
	});
}
