import { spawn } from "node:child_process";

export async function runCliProcess(input: {
	args: string[];
	env?: NodeJS.ProcessEnv;
}): Promise<{
	exitCode: number | null;
	stderr: string;
	stdout: string;
}> {
	return new Promise((resolve, reject) => {
		const child = spawn(process.execPath, ["./bin/xcode-mcli.ts", ...input.args], {
			cwd: process.cwd(),
			env: {
				...process.env,
				...input.env,
			},
			stdio: ["ignore", "pipe", "pipe"],
		});
		let stdout = "";
		let stderr = "";
		child.stdout.setEncoding("utf8");
		child.stderr.setEncoding("utf8");
		child.stdout.on("data", (chunk) => {
			stdout += chunk;
		});
		child.stderr.on("data", (chunk) => {
			stderr += chunk;
		});
		child.on("error", reject);
		child.on("exit", (exitCode) => {
			resolve({
				exitCode,
				stdout,
				stderr,
			});
		});
	});
}
