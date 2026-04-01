import { execFile as execFileCallback } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import { promisify } from "node:util";

import { runtimeError } from "../core/errors.ts";
import { resolveDaemonPidFilePath, resolveDaemonSocketPath } from "./env.ts";

const execFile = promisify(execFileCallback);
const daemonCommandFragment = "daemon-host-entry.ts";

function isOwnedDaemonProcessError(error: unknown): boolean {
	return error instanceof Error && "code" in error && error.code === 1;
}

async function isOwnedDaemonProcess(pid: number): Promise<boolean> {
	try {
		const { stdout } = await execFile("ps", ["-p", String(pid), "-o", "command="]);
		return stdout.includes(daemonCommandFragment);
	} catch (error) {
		if (isOwnedDaemonProcessError(error)) {
			return false;
		}
		throw error;
	}
}

export function isNodeErrorWithCode(
	error: unknown,
	code: string,
): error is NodeJS.ErrnoException {
	return error instanceof Error && "code" in error && error.code === code;
}

export function isProcessRunning(pid: number): boolean {
	try {
		process.kill(pid, 0);
		return true;
	} catch (error) {
		if (isNodeErrorWithCode(error, "ESRCH")) {
			return false;
		}
		throw error;
	}
}

export async function cleanupDaemonFiles(): Promise<void> {
	await Promise.all([
		rm(resolveDaemonSocketPath(), { force: true }),
		rm(resolveDaemonPidFilePath(), { force: true }),
	]);
}

export async function waitForProcessExit(pid: number): Promise<void> {
	for (let attempt = 0; attempt < 40; attempt += 1) {
		if (!isProcessRunning(pid)) {
			return;
		}
		await new Promise((resolve) => {
			setTimeout(resolve, 50);
		});
	}
	throw runtimeError("Timed out while stopping the daemon.");
}

export async function readDaemonPid(): Promise<number | null> {
	try {
		const content = await readFile(resolveDaemonPidFilePath(), "utf8");
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

export async function readLiveDaemonPid(): Promise<number | null> {
	const pid = await readDaemonPid();
	if (!pid) {
		return null;
	}
	if (!isProcessRunning(pid)) {
		return null;
	}
	return await isOwnedDaemonProcess(pid) ? pid : null;
}
