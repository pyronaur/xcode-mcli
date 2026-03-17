import { expect, test } from "vitest";

import { EXIT_RUNTIME_ERROR } from "../src/constants.ts";
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
