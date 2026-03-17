import { expect, test } from "vitest";

import { runCommandTemplateCli } from "../src/core/command-dispatch.ts";
import { captureConsoleLogs } from "./helpers/console.ts";

test("version command prints text output", async () => {
	const lines = await captureConsoleLogs(async () => {
		await runCommandTemplateCli(["project", "version"], process.cwd());
	});
	expect(lines).toHaveLength(1);
	expect(lines[0]).toMatch(/^Package version is \d+\.\d+\.\d+\./);
});
