import { z } from "zod";

import { runtimeError } from "../core/errors.ts";
import { callDaemonTool } from "./daemon-host.ts";
import { readDaemonState, setActiveTabIdentifier } from "./daemon-state.ts";

const windowSchema = z.object({
	tabIdentifier: z.string().min(1),
	workspacePath: z.string().min(1),
});
const windowsStructuredResultSchema = z.object({
	structuredContent: z
		.object({
			windows: z.array(windowSchema),
		})
		.optional(),
	text: z.string().default(""),
});

function parseWindowsFromText(text: string): Array<z.infer<typeof windowSchema>> {
	return text
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.startsWith("* tabIdentifier: "))
		.flatMap((line) => {
			const match = /^\* tabIdentifier: ([^,]+), workspacePath: (.+)$/.exec(line);
			if (!match?.[1] || !match[2]) {
				return [];
			}
			return [
				{
					tabIdentifier: match[1],
					workspacePath: match[2],
				},
			];
		});
}

export async function resolveTabIdentifier(input: {
	explicitTabIdentifier?: string;
}): Promise<string> {
	const explicitTabIdentifier = input.explicitTabIdentifier?.trim();
	if (explicitTabIdentifier) {
		await setActiveTabIdentifier(explicitTabIdentifier);
		return explicitTabIdentifier;
	}
	const daemonState = await readDaemonState();
	if (daemonState.activeTabIdentifier) {
		return daemonState.activeTabIdentifier;
	}
	const result = windowsStructuredResultSchema.parse(
		await callDaemonTool({
			name: "XcodeListWindows",
			arguments: {},
		}),
	);
	const windows = result.structuredContent?.windows ?? parseWindowsFromText(result.text);
	if (windows.length === 1) {
		const firstWindow = windows[0];
		if (!firstWindow) {
			throw runtimeError("No active Xcode workspace window found.");
		}
		await setActiveTabIdentifier(firstWindow.tabIdentifier);
		return firstWindow.tabIdentifier;
	}
	if (windows.length === 0) {
		throw runtimeError("No active Xcode workspace window found.");
	}
	throw runtimeError(
		"Multiple Xcode windows are open. Run `xcode-mcli windows list` and `windows use --tab-identifier <id>`.",
	);
}
