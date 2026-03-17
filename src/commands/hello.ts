import { z } from "zod";

import { defineCommand } from "../core/command-definition.ts";

const helloOptionsSchema = z.object({
	name: z.string().trim().min(1).optional().default("World"),
});

function printHello(name: string): void {
	console.log(`Hello, ${name}.`);
}

export const helloCommand = defineCommand({
	path: ["hello"],
	description: "Print a greeting.",
	configure: (command) => {
		command.option("--name <name>", "Name to greet.");
	},
	optionsSchema: helloOptionsSchema,
	run: async ({ options }) => {
		printHello(options.name);
	},
});
