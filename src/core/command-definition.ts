import { Command } from "commander";
import { z } from "zod";
import type { output, ZodType } from "zod";

import { callDaemonTool } from "../runtime/daemon-host.ts";
import { printVerboseTool } from "../runtime/output.ts";
import type { ToolName } from "../runtime/xcode-tool-contract.ts";
import {
	type CommandDefinition,
	isToolCommandDefinition,
	type PlainCommandDefinition,
	type ToolCommandDefinition,
} from "./contracts.ts";
import { describeCommandGroup, describeToolCommand } from "./description-catalog.ts";
import { attachCommandMetadata, runtimeError, usageError } from "./errors.ts";
import { readCommandGroupHelpText, readCommandHelpText } from "./help-text.ts";

function commandPathToString(path: readonly string[]): string {
	return path.join(" ");
}

function formatInvalidOptionsMessage(commandPath: readonly string[]): string {
	return `Invalid options for command: ${commandPathToString(commandPath)}`;
}

function parseOptions<TSchema extends ZodType>(
	commandPath: readonly string[],
	optionsSchema: TSchema,
	value: unknown,
): output<TSchema> {
	const result = optionsSchema.safeParse(value);
	if (result.success) {
		return result.data;
	}
	throw usageError(formatInvalidOptionsMessage(commandPath));
}

function readCommand(actionArgs: unknown[]): Command {
	const candidate = actionArgs[actionArgs.length - 1];
	if (candidate instanceof Command) {
		return candidate;
	}
	throw runtimeError("Failed to read command context.");
}

const globalOptionsSchema = z.object({
	json: z.boolean().default(false),
	verbose: z.boolean().default(false),
});

function readGlobalOptions(command: Command) {
	return globalOptionsSchema.parse(command.optsWithGlobals());
}

function addSharedGlobalOptions(command: Command): void {
	command.option("--json", "Print command results as JSON.");
	command.option("--verbose", "Print extra execution details.");
}

function registerCommandAction<TSchema extends ZodType>(input: {
	command: Command;
	definition: CommandDefinition<TSchema>;
	projectDir: string;
}): void {
	input.command.action(async (...actionArgs: unknown[]) => {
		const command = readCommand(actionArgs);
		const parsedOptions = parseOptions(
			input.definition.path,
			input.definition.optionsSchema,
			command.optsWithGlobals(),
		);
		const globals = readGlobalOptions(command);
		const context = {
			commandPath: input.definition.path,
			globals,
			projectDir: input.projectDir,
			options: parsedOptions,
		};
		try {
			if (isToolCommandDefinition(input.definition)) {
				printVerboseTool(globals, input.definition.toolName);
				const toolArguments = await input.definition.buildArguments(context);
				const result = await callDaemonTool({
					name: input.definition.toolName,
					arguments: toolArguments,
				});
				await input.definition.run({
					...context,
					toolArguments,
				}, result);
				return;
			}
			await input.definition.run(context);
		} catch (error) {
			throw attachCommandMetadata(error, {
				commandName: commandPathToString(input.definition.path),
				toolName: isToolCommandDefinition(input.definition)
					? input.definition.toolName
					: undefined,
			});
		}
	});
}

function findOrCreateGroupCommand(program: Command, groupName: string): Command {
	const existingGroup = program.commands.find((candidate) => candidate.name() === groupName);
	if (existingGroup) {
		return existingGroup;
	}
	const groupCommand = program.command(groupName)
		.description(describeCommandGroup(groupName))
		.exitOverride();
	const helpText = readCommandGroupHelpText(groupName);
	if (helpText) {
		groupCommand.addHelpText("after", helpText);
	}
	return groupCommand;
}

function createLeafCommand(parent: Command, input: {
	name: string;
	description: string;
	helpText?: string;
}): Command {
	const command = parent.command(input.name).description(input.description).exitOverride();
	if (input.helpText) {
		command.addHelpText("after", input.helpText);
	}
	return command;
}

function createRegisteredCommand(
	program: Command,
	definition: CommandDefinition,
): Command {
	const path = [...definition.path];
	const leaf = path.pop();
	if (!leaf) {
		throw runtimeError("Command path cannot be empty.");
	}
	let parent = program;
	for (const groupName of path) {
		parent = findOrCreateGroupCommand(parent, groupName);
	}
	const toolName = isToolCommandDefinition(definition) ? definition.toolName : undefined;
	return createLeafCommand(parent, {
		name: leaf,
		description: describeToolCommand(toolName, definition.description),
		helpText: readCommandHelpText(definition.path),
	});
}

export function registerCommand<TSchema extends ZodType>(input: {
	program: Command;
	definition: CommandDefinition<TSchema>;
	projectDir: string;
}): void {
	const command = createRegisteredCommand(input.program, input.definition);
	addSharedGlobalOptions(command);
	input.definition.configure?.(command);
	registerCommandAction({
		command,
		definition: input.definition,
		projectDir: input.projectDir,
	});
}

export function defineCommand<TSchema extends ZodType>(
	definition: Omit<PlainCommandDefinition<TSchema>, "kind">,
): PlainCommandDefinition<TSchema> {
	return {
		kind: "command",
		...definition,
	};
}

export function defineToolCommand<
	K extends ToolName,
	TSchema extends ZodType,
	TArguments extends Record<string, unknown>,
>(
	definition: Omit<ToolCommandDefinition<K, TSchema, TArguments>, "kind">,
): ToolCommandDefinition<K, TSchema, TArguments> {
	return {
		kind: "tool",
		...definition,
	};
}
