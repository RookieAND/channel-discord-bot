import type { GuildTextBasedChannel, Message, User } from "discord.js";
import { isUndefined } from "es-toolkit";

import { PromptFailError } from "./prompt-error";
import { InteractionEndReason } from "./prompt.constants";

interface CollectMessageProps<
	ChannelType extends GuildTextBasedChannel = GuildTextBasedChannel,
> {
	channel: ChannelType;
	user: User;
	timeout: number;
	validate?: (message: Message) => boolean;
	retry?: number;
}

export const collectMessage = async <
	ChannelType extends GuildTextBasedChannel,
	ResponseType extends string = string,
>({
	channel,
	user,
	validate,
	timeout,
	retry,
}: CollectMessageProps<ChannelType>) => {
	let leftAttempts = retry ?? 0;

	const collector = channel.createMessageCollector({
		filter: (msg) => msg.author.id === user.id,
		time: timeout,
	});

	const response = await new Promise<ResponseType>((resolve, reject) => {
		collector.on("collect", (message) => {
			if (validate?.(message)) {
				collector.stop(InteractionEndReason.SUCCESS);
				return;
			}
			if (isUndefined(retry)) {
				collector.stop(InteractionEndReason.NO_RESPONSE);
				return;
			}
			if (leftAttempts > 0) {
				leftAttempts -= 1;
				message.delete();
				return;
			}
			collector.stop(InteractionEndReason.RETRY_LIMIT_REACHED);
		});

		collector.on("end", (collection, reason) => {
			if (reason === InteractionEndReason.SUCCESS && collection.size > 0) {
				const message = collection.first();
				if (message) resolve(message.content as ResponseType);
				return;
			}
			if (reason === InteractionEndReason.RETRY_LIMIT_REACHED) {
				reject(
					new PromptFailError(
						"Retry limit reached",
						InteractionEndReason.RETRY_LIMIT_REACHED,
					),
				);
			}
			if (reason === InteractionEndReason.TIMEOUT) {
				reject(new PromptFailError("Timeout", InteractionEndReason.TIMEOUT));
			}
			reject(
				new PromptFailError("No Response", InteractionEndReason.NO_RESPONSE),
			);
		});
	});

	return response;
};
