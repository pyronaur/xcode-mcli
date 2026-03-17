import { expect, test } from "vitest";

import { EXIT_RUNTIME_ERROR, EXIT_USAGE_ERROR } from "../src/constants.ts";
import { runCliProcess } from "./helpers/cli-process.ts";

test("cli prints a stable JSON error envelope for runtime failures", async () => {
	const result = await runCliProcess({
		args: ["setup", "--json"],
		env: {
			XCODE_MCLI_XCRUN_PATH: "/definitely/missing/xcrun",
		},
	});
	expect(result.exitCode).toBe(EXIT_RUNTIME_ERROR);
	expect(result.stderr).toBe("");
	expect(JSON.parse(result.stdout)).toEqual({
		ok: false,
		command: "setup",
		error: {
			kind: "runtime",
			message: "Failed to locate xcrun mcpbridge. spawn /definitely/missing/xcrun ENOENT",
		},
	});
});

test("cli prints the failing command name when global tab selection is present", async () => {
	const result = await runCliProcess({
		args: ["--json", "--tab-identifier", "windowtab1", "wat"],
	});
	expect(result.exitCode).toBe(EXIT_USAGE_ERROR);
	expect(result.stderr).toBe("");
	expect(JSON.parse(result.stdout)).toEqual({
		ok: false,
		command: "wat",
		error: {
			kind: "usage",
			message: "error: unknown command 'wat'",
		},
	});
});
