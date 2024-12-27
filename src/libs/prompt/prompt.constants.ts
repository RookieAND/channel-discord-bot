export enum InteractionEndReason {
	TIMEOUT = "timeout",
	RETRY_LIMIT_REACHED = "retry_limit_reached",
	NO_RESPONSE = "no_response",
	SUCCESS = "success",
}

export type InteractionFailedReason = Exclude<
	InteractionEndReason,
	InteractionEndReason.SUCCESS
>;