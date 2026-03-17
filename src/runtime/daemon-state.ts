import { mkdir, readFile, writeFile } from "node:fs/promises";
import { z } from "zod";

import { resolveStateFilePath, resolveStateRoot } from "./env.ts";
import { xcodeWindowSchema } from "./xcode-windows.ts";

const daemonStateSchema = z.object({
	activeTabIdentifier: z.string().trim().min(1).optional(),
	lastSeenWindows: z.array(xcodeWindowSchema).optional(),
});

export type DaemonState = z.infer<typeof daemonStateSchema>;

export async function readDaemonState(): Promise<DaemonState> {
	const stateFilePath = resolveStateFilePath();
	try {
		const content = await readFile(stateFilePath, "utf8");
		return daemonStateSchema.parse(JSON.parse(content));
	} catch (error) {
		if (error instanceof Error && "code" in error && error.code === "ENOENT") {
			return {};
		}
		throw error;
	}
}

export async function writeDaemonState(state: DaemonState): Promise<void> {
	await mkdir(resolveStateRoot(), { recursive: true });
	await writeFile(resolveStateFilePath(), JSON.stringify(state, null, 2));
}

export async function setActiveTabIdentifier(tabIdentifier: string): Promise<void> {
	const currentState = await readDaemonState();
	await writeDaemonState({
		...currentState,
		activeTabIdentifier: tabIdentifier,
	});
}

export async function setLastSeenWindows(
	lastSeenWindows: Array<z.infer<typeof xcodeWindowSchema>>,
): Promise<void> {
	const currentState = await readDaemonState();
	await writeDaemonState({
		...currentState,
		lastSeenWindows,
	});
}
