import type { Command } from "commander";
import { readFile } from "node:fs/promises";
import { z } from "zod";

import { defineCommand } from "../core/command-definition.ts";
import { runtimeError } from "../core/errors.ts";
import { callDaemonTool } from "../runtime/daemon-host.ts";
import { resolveTabIdentifier } from "../runtime/tab-resolver.ts";

type ToolCommandResult = {
	structuredContent?: unknown;
	text: string;
};

type ToolCommandDefinitionInput<TOptions> = {
	buildArguments: (options: TOptions) => Promise<Record<string, unknown>> | Record<string, unknown>;
	configure?: (command: Command) => void;
	description: string;
	path: readonly [string, ...string[]];
	requiresTab?: boolean;
	toolName: string;
	optionsSchema: z.ZodType<TOptions>;
};

const toolCommandResultSchema = z.object({
	structuredContent: z.unknown().optional(),
	text: z.string().default(""),
});

function defaultToolText(result: ToolCommandResult): string {
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
	command.option("--tab-identifier <id>", "Active Xcode window tab identifier.");
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

export function createToolCommand<TOptions>(input: ToolCommandDefinitionInput<TOptions>) {
	return defineCommand({
		path: input.path,
		description: input.description,
		configure: input.configure,
		optionsSchema: input.optionsSchema,
		run: async ({ options }) => {
			const toolArguments = await input.buildArguments(options);
			if (input.requiresTab && typeof toolArguments.tabIdentifier !== "string") {
				toolArguments.tabIdentifier = await resolveTabIdentifier({
					explicitTabIdentifier: readTabIdentifierOption(options),
				});
			}
			const result = toolCommandResultSchema.parse(
				await callDaemonTool({
					name: input.toolName,
					arguments: toolArguments,
				}),
			);
			console.log(defaultToolText(result));
		},
	});
}
