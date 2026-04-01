import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const trackedStateRoots = new Set<string>();
let handlersInstalled = false;

function isNodeErrorWithCode(
	error: unknown,
	code: string,
): error is NodeJS.ErrnoException {
	return error instanceof Error && "code" in error && error.code === code;
}

function readTrackedDaemonPid(stateRoot: string): number | null {
	try {
		const content = readFileSync(join(stateRoot, "daemon.pid"), "utf8");
		const pid = Number.parseInt(content.trim(), 10);
		if (Number.isInteger(pid) && pid > 0) {
			return pid;
		}
		return null;
	} catch (error) {
		if (isNodeErrorWithCode(error, "ENOENT")) {
			return null;
		}
		throw error;
	}
}

function cleanupTrackedStateRoots(): void {
	for (const stateRoot of trackedStateRoots) {
		const pid = readTrackedDaemonPid(stateRoot);
		if (pid) {
			try {
				process.kill(pid, "SIGTERM");
			} catch (error) {
				if (!isNodeErrorWithCode(error, "ESRCH")) {
					throw error;
				}
			}
		}
		rmSync(join(stateRoot, "daemon.pid"), { force: true });
		rmSync(join(stateRoot, "daemon.sock"), { force: true });
	}
}

function installCleanupHandlers(): void {
	if (handlersInstalled) {
		return;
	}
	handlersInstalled = true;
	process.on("exit", cleanupTrackedStateRoots);
	for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
		process.on(signal, () => {
			cleanupTrackedStateRoots();
			process.exit(1);
		});
	}
}

export function trackDaemonStateRoot(stateRoot: string): void {
	installCleanupHandlers();
	trackedStateRoots.add(stateRoot);
}

export function untrackDaemonStateRoot(stateRoot: string): void {
	trackedStateRoots.delete(stateRoot);
}
