import { readFile } from "node:fs/promises";

import { resolveDaemonPidFilePath } from "./env.ts";

export type DaemonStatus =
	| {
		running: false;
	}
	| {
		running: true;
		pid: string;
	};

export async function readDaemonStatus(): Promise<DaemonStatus> {
	try {
		const pid = (await readFile(resolveDaemonPidFilePath(), "utf8")).trim();
		if (pid.length === 0) {
			return { running: false };
		}
		return {
			running: true,
			pid,
		};
	} catch (error) {
		if (error instanceof Error && "code" in error && error.code === "ENOENT") {
			return { running: false };
		}
		throw error;
	}
}
