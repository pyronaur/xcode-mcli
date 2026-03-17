import { vi } from "vitest";

function toChunkString(chunk: unknown): string {
	if (typeof chunk === "string") {
		return chunk;
	}
	if (chunk instanceof Uint8Array) {
		return Buffer.from(chunk).toString("utf8");
	}
	return String(chunk);
}

export async function captureProcessOutput(action: () => Promise<void>): Promise<{
	stdout: string;
	stderr: string;
}> {
	let stdout = "";
	let stderr = "";
	const stdoutSpy = vi
		.spyOn(process.stdout, "write")
		.mockImplementation(((chunk: unknown) => {
			stdout += toChunkString(chunk);
			return true;
		}) as typeof process.stdout.write);
	const stderrSpy = vi
		.spyOn(process.stderr, "write")
		.mockImplementation(((chunk: unknown) => {
			stderr += toChunkString(chunk);
			return true;
		}) as typeof process.stderr.write);
	try {
		await action();
		return { stdout, stderr };
	} finally {
		stdoutSpy.mockRestore();
		stderrSpy.mockRestore();
	}
}

