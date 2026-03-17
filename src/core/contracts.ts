import type { Command } from "commander";
import type { output, ZodType } from "zod";

export type CommandRunContext<TOptions> = {
	projectDir: string;
	options: TOptions;
};

export type CommandPath = readonly [string, ...string[]];

export type CommandDefinition<TSchema extends ZodType = ZodType> = {
	path: CommandPath;
	description: string;
	configure?: (command: Command) => void;
	optionsSchema: TSchema;
	run: (context: CommandRunContext<output<TSchema>>) => Promise<void>;
};
