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
					new PromptFailError({
						title: "재시도 횟수 초과",
						description: "문답 과정에서 지정된 재시도 횟수를 초과했습니다.",
						type: InteractionEndReason.RETRY_LIMIT_REACHED,
					}))
			}
			if (reason === InteractionEndReason.TIMEOUT) {
				reject(new PromptFailError({
					title: "시간 초과",
					description: "문답 과정에서 지정된 시간 내에 응답이 없었습니다.",
					type: InteractionEndReason.TIMEOUT,
				}));
			}
			reject(
				new PromptFailError({
					title: "응답 없음",
					description: "문답 과정에서 질문에 대한 응답을 입력하지 않았습니다.",
					type: InteractionEndReason.NO_RESPONSE,
				}),
			);
		});
	});

	return response;
};
