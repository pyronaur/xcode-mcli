import type { Command } from "commander";
import type { output, ZodType } from "zod";

import type {
	ToolCallResult,
	ToolName,
} from "../runtime/xcode-tool-contract.ts";

export type GlobalOptions = {
	json: boolean;
	verbose: boolean;
};

export type CommandRunContext<TOptions> = {
	commandPath: CommandPath;
	globals: GlobalOptions;
	projectDir: string;
	options: TOptions;
};

export type CommandPath = readonly [string, ...string[]];

type BaseCommandDefinition<TSchema extends ZodType> = {
	path: CommandPath;
	description: string;
	configure?: (command: Command) => void;
	optionsSchema: TSchema;
};

export type PlainCommandDefinition<TSchema extends ZodType = ZodType> =
	& BaseCommandDefinition<
		TSchema
	>
	& {
		kind: "command";
		run(context: CommandRunContext<output<TSchema>>): Promise<void>;
	};

export type ToolCommandRunContext<TOptions, TArguments extends Record<string, unknown>> =
	& CommandRunContext<TOptions>
	& {
		toolArguments: TArguments;
	};

export type ToolCommandDefinition<
	K extends ToolName = ToolName,
	TSchema extends ZodType = ZodType,
	TArguments extends Record<string, unknown> = Record<string, unknown>,
> = BaseCommandDefinition<TSchema> & {
	kind: "tool";
	toolName: K;
	buildArguments(context: CommandRunContext<output<TSchema>>): Promise<TArguments> | TArguments;
	run(
		context: ToolCommandRunContext<output<TSchema>, TArguments>,
		result: ToolCallResult<K>,
	): Promise<void>;
};

export type CommandDefinition<TSchema extends ZodType = ZodType> =
	| PlainCommandDefinition<TSchema>
	| ToolCommandDefinition<ToolName, TSchema>;

export function isToolCommandDefinition(
	definition: CommandDefinition,
): definition is ToolCommandDefinition<ToolName, ZodType> {
	return definition.kind === "tool";
}
