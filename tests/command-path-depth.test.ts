import { Command } from "commander";
import { expect, test } from "vitest";
import { z } from "zod";

import { defineCommand, registerCommand } from "../src/core/command-definition.ts";

test("register command supports command paths deeper than two segments", async () => {
	const executions: string[] = [];
	const definition = defineCommand({
		path: ["workspace", "full", "sync"],
		description: "Test deep command routing.",
		optionsSchema: z.object({}),
		run: async () => {
			executions.push("ran");
		},
	});
	const program = new Command().name("command-template").exitOverride();
	registerCommand({
		program,
		definition,
		projectDir: process.cwd(),
	});
	await program.parseAsync(["workspace", "full", "sync"], { from: "user" });
	expect(executions).toEqual(["ran"]);
});
