import { homedir } from "node:os";
import { join } from "node:path";

const STATE_ROOT_ENV_NAME = "XCODE_MCLI_STATE_ROOT";
const XCRUN_PATH_ENV_NAME = "XCODE_MCLI_XCRUN_PATH";

export function resolveStateRoot(): string {
	const override = process.env[STATE_ROOT_ENV_NAME]?.trim();
	if (override) {
		return override;
	}
	return join(homedir(), "Library", "Application Support", "xcode-mcli");
}

export function resolveStateFilePath(): string {
	return join(resolveStateRoot(), "state.json");
}

export function resolveDaemonPidFilePath(): string {
	return join(resolveStateRoot(), "daemon.pid");
}

export function resolveXcrunPath(): string {
	const override = process.env[XCRUN_PATH_ENV_NAME]?.trim();
	if (override) {
		return override;
	}
	return "xcrun";
}
