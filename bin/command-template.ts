#!/usr/bin/env node

import { runCommandTemplateCliFromProcess } from "../src/core/command-dispatch.ts";
import { toTemplateError } from "../src/core/errors.ts";

try {
	await runCommandTemplateCliFromProcess();
} catch (error) {
	const wrapped = toTemplateError(error);
	console.error(wrapped.message);
	process.exit(wrapped.exitCode);
}
