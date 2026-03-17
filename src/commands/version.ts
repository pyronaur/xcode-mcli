import { z } from "zod";

import { defineCommand } from "../core/command-definition.ts";
import { readPackageVersion } from "../core/package-version.ts";

const versionOptionsSchema = z.object({});

function printVersion(version: string): void {
	console.log(`Package version is ${version}.`);
}

export const versionCommand = defineCommand({
	path: ["project", "version"],
	description: "Show the package version.",
	optionsSchema: versionOptionsSchema,
	run: async () => {
		const version = await readPackageVersion();
		printVersion(version);
	},
});
