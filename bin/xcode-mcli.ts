#!/usr/bin/env node

import { runXcodeMcliFromProcess } from "../src/core/command-dispatch.ts";
import { toTemplateError } from "../src/core/errors.ts";

try {
	await runXcodeMcliFromProcess();
} catch (error) {
	const wrapped = toTemplateError(error);
	console.error(wrapped.message);
	process.exit(wrapped.exitCode);
}
