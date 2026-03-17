import { Command } from "commander";
import type { output, ZodType } from "zod";

import type { CommandDefinition } from "./contracts.ts";
import { runtimeError, usageError } from "./errors.ts";

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
			command.opts(),
		);
		await input.definition.run({
			projectDir: input.projectDir,
			options: parsedOptions,
		});
	});
}

function findOrCreateGroupCommand(program: Command, groupName: string): Command {
	const existingGroup = program.commands.find((candidate) => candidate.name() === groupName);
	if (existingGroup) {
		return existingGroup;
	}
	return program.command(groupName).description(`${groupName} commands.`).exitOverride();
}

function createLeafCommand(parent: Command, input: {
	name: string;
	description: string;
}): Command {
	return parent.command(input.name).description(input.description).exitOverride();
}

function createRegisteredCommand(
	program: Command,
	definition: CommandDefinition<ZodType>,
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
	return createLeafCommand(parent, {
		name: leaf,
		description: definition.description,
	});
}

export function registerCommand<TSchema extends ZodType>(input: {
	program: Command;
	definition: CommandDefinition<TSchema>;
	projectDir: string;
}): void {
	const command = createRegisteredCommand(input.program, input.definition);
	input.definition.configure?.(command);
	registerCommandAction({
		command,
		definition: input.definition,
		projectDir: input.projectDir,
	});
}

export function defineCommand<TSchema extends ZodType>(
	definition: CommandDefinition<TSchema>,
): CommandDefinition<TSchema> {
	return definition;
}
