import type { ChildProcessWithoutNullStreams } from "node:child_process";
import readline from "node:readline";
import { z } from "zod";

import { runtimeError } from "../core/errors.ts";

const jsonRpcMessageSchema = z.object({
	id: z.number().int().optional(),
	result: z.unknown().optional(),
	error: z
		.object({
			message: z.string().optional(),
		})
		.optional(),
});

type PendingRequest = {
	reject: (error: Error) => void;
	resolve: (value: unknown) => void;
};

export class JsonRpcPeer {
	readonly #child: ChildProcessWithoutNullStreams;
	readonly #pendingRequests = new Map<number, PendingRequest>();
	#nextRequestId = 1;

	constructor(child: ChildProcessWithoutNullStreams) {
		this.#child = child;
		this.#bindLifecycle();
	}

	async request(method: string, params: Record<string, unknown>): Promise<unknown> {
		const id = this.#nextRequestId++;
		const payload = JSON.stringify({
			jsonrpc: "2.0",
			id,
			method,
			params,
		});
		return new Promise((resolve, reject) => {
			this.#pendingRequests.set(id, { resolve, reject });
			this.#child.stdin.write(`${payload}\n`, (error) => {
				if (!error) {
					return;
				}
				this.#pendingRequests.delete(id);
				reject(runtimeError(`Failed to write JSON-RPC request. ${error.message}`));
			});
		});
	}

	notify(method: string, params: Record<string, unknown>): void {
		const payload = JSON.stringify({
			jsonrpc: "2.0",
			method,
			params,
		});
		this.#child.stdin.write(`${payload}\n`);
	}

	async close(): Promise<void> {
		this.#child.kill();
	}

	#bindLifecycle(): void {
		const rl = readline.createInterface({
			input: this.#child.stdout,
			crlfDelay: Infinity,
		});
		rl.on("line", (line) => {
			this.#handleMessageLine(line);
		});
		this.#child.on("error", (error) => {
			this.#rejectPending(runtimeError(`Bridge process error. ${error.message}`));
		});
		this.#child.on("exit", (code, signal) => {
			if (code === 0 || signal === "SIGTERM") {
				this.#rejectPending(runtimeError("Bridge process closed."));
				return;
			}
			this.#rejectPending(
				runtimeError(`Bridge process exited unexpectedly with code ${code ?? "null"}.`),
			);
		});
	}

	#handleMessageLine(line: string): void {
		if (line.trim().length === 0) {
			return;
		}
		const message = jsonRpcMessageSchema.parse(JSON.parse(line));
		const id = typeof message.id === "number" ? message.id : undefined;
		if (id === undefined) {
			return;
		}
		const pending = this.#pendingRequests.get(id);
		if (!pending) {
			return;
		}
		this.#pendingRequests.delete(id);
		if ("error" in message && message.error) {
			pending.reject(runtimeError(message.error.message ?? "JSON-RPC request failed."));
			return;
		}
		pending.resolve(message.result);
	}

	#rejectPending(error: Error): void {
		for (const [id, pending] of this.#pendingRequests) {
			this.#pendingRequests.delete(id);
			pending.reject(error);
		}
	}
}
