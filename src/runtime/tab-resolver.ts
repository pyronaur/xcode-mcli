import { runtimeError } from "../core/errors.ts";
import { callDaemonTool } from "./daemon-host.ts";
import { readDaemonState, setActiveTabIdentifier } from "./daemon-state.ts";
import { readWindowsFromToolResult, xcodeWindowsToolResultSchema } from "./xcode-windows.ts";

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
	const result = xcodeWindowsToolResultSchema.parse(
		await callDaemonTool({
			name: "XcodeListWindows",
			arguments: {},
		}),
	);
	const windows = readWindowsFromToolResult(result);
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
