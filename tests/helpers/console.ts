import { vi } from "vitest";

function stringifyArg(value: unknown): string {
	if (typeof value === "string") {
		return value;
	}
	return String(value);
}

export async function captureConsoleLogs(action: () => Promise<void>): Promise<string[]> {
	const lines: string[] = [];
	const logSpy = vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
		lines.push(args.map(stringifyArg).join(" "));
	});
	try {
		await action();
		return lines;
	} finally {
		logSpy.mockRestore();
	}
}
