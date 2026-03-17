#!/usr/bin/env node

import { runXcodeMcliFromProcess } from "../src/core/command-dispatch.ts";
import { toTemplateError } from "../src/core/errors.ts";
import { printCommandError } from "../src/runtime/output.ts";

try {
	await runXcodeMcliFromProcess();
} catch (error) {
	const wrapped = toTemplateError(error);
	printCommandError({
		argv: process.argv.slice(2),
		error: wrapped,
	});
	process.exit(wrapped.exitCode);
}
