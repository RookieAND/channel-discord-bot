import type { InteractionEndReason } from "./prompt.constants";

type InteractionFailReason = Exclude<InteractionEndReason, InteractionEndReason.SUCCESS>;

interface PromptFailErrorProps {
	title: string;
	description: string;
	type: InteractionFailReason;
}
export class PromptFailError extends Error {
	title: string;
	description: string;
	type: InteractionFailReason;
	constructor({ title, description, type }: PromptFailErrorProps) {
		super(title);
		this.title = title;
		this.description = description;
		this.type = type;
	}

	getDetailReason() {
		return { title: this.title, description: this.description };
	}
}

export const isPromptFailedError = (
    error: unknown,
): error is PromptFailError => {
    return error instanceof PromptFailError;
};