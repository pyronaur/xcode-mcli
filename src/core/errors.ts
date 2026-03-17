import { EXIT_RUNTIME_ERROR, EXIT_USAGE_ERROR } from "../constants.ts";

export class TemplateError extends Error {
	public readonly exitCode: number;

	constructor(message: string, exitCode: number) {
		super(message);
		this.name = "TemplateError";
		this.exitCode = exitCode;
	}
}

export function usageError(message: string): TemplateError {
	const error = new TemplateError(message, EXIT_USAGE_ERROR);
	error.name = "UsageError";
	return error;
}

export function runtimeError(message: string): TemplateError {
	const error = new TemplateError(message, EXIT_RUNTIME_ERROR);
	error.name = "RuntimeError";
	return error;
}

export function toTemplateError(error: unknown): TemplateError {
	if (error instanceof TemplateError) {
		return error;
	}
	if (error instanceof Error) {
		return runtimeError(error.message);
	}
	return runtimeError(String(error));
}
