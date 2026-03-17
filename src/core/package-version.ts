import * as fs from "node:fs/promises";

import { runtimeError } from "./errors.ts";

const PACKAGE_JSON_PATH = new URL("../../package.json", import.meta.url);

const PACKAGE_VERSION_ERROR_MESSAGE =
	"Failed to read package version. Set a valid version in package.json.";

export async function readPackageVersion(): Promise<string> {
	let raw: string;
	try {
		raw = await fs.readFile(PACKAGE_JSON_PATH, "utf8");
	} catch {
		throw runtimeError(PACKAGE_VERSION_ERROR_MESSAGE);
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		throw runtimeError(PACKAGE_VERSION_ERROR_MESSAGE);
	}
	if (typeof parsed === "object" && parsed && !Array.isArray(parsed)) {
		const version = Reflect.get(parsed, "version");
		if (typeof version === "string" && version.trim()) {
			return version.trim();
		}
	}
	throw runtimeError(PACKAGE_VERSION_ERROR_MESSAGE);
}
