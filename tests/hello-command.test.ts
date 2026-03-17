import { expect, test } from "vitest";

import { runCommandTemplateCli } from "../src/core/command-dispatch.ts";
import { captureConsoleLogs } from "./helpers/console.ts";

test("hello command prints default greeting in text mode", async () => {
	const lines = await captureConsoleLogs(async () => {
		await runCommandTemplateCli(["hello"], process.cwd());
	});
	expect(lines).toEqual(["Hello, World."]);
});

test("hello command prints custom greeting in text mode", async () => {
	const lines = await captureConsoleLogs(async () => {
		await runCommandTemplateCli(["hello", "--name", "Ada"], process.cwd());
	});
	expect(lines).toEqual(["Hello, Ada."]);
});
