import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

import { runtimeError } from "../core/errors.ts";
import { resolveXcrunPath } from "./env.ts";

const execFile = promisify(execFileCallback);

function toXcrunRuntimeError(error: unknown, message: string) {
	if (error instanceof Error) {
		return runtimeError(`${message} ${error.message}`);
	}
	return runtimeError(message);
}

export async function findMcpbridgePath(): Promise<string> {
	try {
		const { stdout } = await execFile(resolveXcrunPath(), ["--find", "mcpbridge"]);
		const bridgePath = stdout.trim();
		if (bridgePath.length > 0) {
			return bridgePath;
		}
		throw runtimeError("xcrun did not return a mcpbridge path.");
	} catch (error) {
		throw toXcrunRuntimeError(error, "Failed to locate xcrun mcpbridge.");
	}
}

export async function verifyMcpbridgeHelp(): Promise<void> {
	try {
		await execFile(resolveXcrunPath(), ["mcpbridge", "--help"]);
	} catch (error) {
		throw toXcrunRuntimeError(error, "Failed to call xcrun mcpbridge --help.");
	}
}
