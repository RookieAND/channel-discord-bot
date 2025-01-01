import type {
	ComponentType,
	MappedInteractionTypes,
	Message,
	MessageComponentType,
	User,
} from "discord.js";
import { isUndefined } from "es-toolkit";

import { PromptFailError } from "./prompt-error";
import { InteractionEndReason } from "./prompt.constants";

interface CollectMessageComponentProps<
	ComponentType extends MessageComponentType,
> {
	message: Message<true>;
	componentType: ComponentType;
	customId: string;
	user: User;
	timeout: number;
	validate?: (message: MappedInteractionTypes[ComponentType]) => boolean;
	retry?: number;
}

export const collectMessageComponent = async <
	ComponentType extends MessageComponentType,
	ResponseType extends ComponentType extends ComponentType.Button ? string : string[],
>({
	message,
	componentType,
	customId,
	user,
	validate,
	timeout,
	retry = 0,
}: CollectMessageComponentProps<ComponentType>) => {
	let leftAttempts = retry;

	const collector = message.createMessageComponentCollector({
		componentType,
		filter: (interaction) =>
			interaction.user.id === user.id && interaction.customId === customId,
		time: timeout,
	});

	const handleResponse = (
		interaction: MappedInteractionTypes[ComponentType],
	) => {
		if (interaction.isButton()) {
			return interaction.customId as ResponseType;
		}
		if (interaction.isAnySelectMenu()) {
			return interaction.values as ResponseType;
		}
		throw new Error("Unreachable Code Error");
	};

	const response = await new Promise<ResponseType>((resolve, reject) => {
		collector.on("collect", (interaction) => {
			interaction.deferUpdate({ fetchReply: true });
			if (!validate || validate(interaction)) {
				collector.stop(InteractionEndReason.SUCCESS);
				return;
			}
			if (isUndefined(retry)) {
				collector.stop(InteractionEndReason.NO_RESPONSE);
				return;
			}
			if (leftAttempts > 0) {
				leftAttempts -= 1;
				return;
			}
			if (leftAttempts === 0 && retry > 0) {
				collector.stop(InteractionEndReason.RETRY_LIMIT_REACHED);
				return;
			}
			collector.stop(InteractionEndReason.NO_RESPONSE);
		});

		collector.on("end", (collection, reason) => {
			if (reason === InteractionEndReason.SUCCESS && collection.size > 0) {
				const interaction = collection.first();
				if (interaction) {
					interaction.deferUpdate();
					resolve(handleResponse(interaction));
				}
			}
			if (reason === InteractionEndReason.RETRY_LIMIT_REACHED) {
				reject(
					new PromptFailError({
						title: "재시도 횟수 초과",
						description: "문답 과정에서 지정된 재시도 횟수를 초과했습니다.",
						type: InteractionEndReason.RETRY_LIMIT_REACHED,
					}),
				);
			}
			if (reason === InteractionEndReason.TIMEOUT) {
				reject(
					new PromptFailError({
						title: "시간 초과",
						description: "문답 과정에서 지정된 시간 내에 응답이 없었습니다.",
						type: InteractionEndReason.TIMEOUT,
					}),
				);
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
