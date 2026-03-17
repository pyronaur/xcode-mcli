import { runDaemonHost } from "./daemon-host.ts";

try {
	await runDaemonHost();
} catch (error) {
	console.error(error);
	process.exit(1);
}
