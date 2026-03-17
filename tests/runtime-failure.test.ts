import { expect, test, vi } from "vitest";

import { TemplateError, runtimeError } from "../src/core/errors.ts";

test("dispatch throws runtime error when startup lookup fails", async () => {
	vi.resetModules();
	vi.doMock("../src/core/package-version.ts", () => ({
		readPackageVersion: async () => {
			throw runtimeError("Failed to read package version. Set a valid version in package.json.");
		},
	}));
	try {
		const { runXcodeMcli } = await import("../src/core/command-dispatch.ts");
		await runXcodeMcli(["setup"], process.cwd());
		throw new Error("Expected runtime error.");
	} catch (error) {
		if (!(error instanceof TemplateError)) {
			throw error;
		}
		expect(error.exitCode).toBe(1);
		expect(error.message).toContain("Failed to read package version");
	} finally {
		vi.doUnmock("../src/core/package-version.ts");
		vi.resetModules();
	}
});
