import type { InteractionFailedReason } from "./prompt.constants";

export class PromptFailError extends Error {
	type: InteractionFailedReason;
	constructor(message: string, type: InteractionFailedReason) {
		super(message);
		this.type = type;
	}
}

export const isPromptFailedError = (
    error: unknown,
): error is PromptFailError => {
    return error instanceof PromptFailError;
};