export enum InteractionEndReason {
	TIMEOUT = "timeout",
	RETRY_LIMIT_REACHED = "retry_limit_reached",
	NO_RESPONSE = "no_response",
	INVALID_RESPONSE = "invalid_response",
	UNEXPECTED_ERROR = "internal_error",
	SUCCESS = "success",
}