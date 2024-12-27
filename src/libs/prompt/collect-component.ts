import type {
	ComponentType,
	MappedInteractionTypes,
	Message,
	User,
} from "discord.js";

import { PromptFailError } from "./prompt-error";
import { InteractionEndReason } from "./prompt.constants";

interface CollectMessageComponentProps<
	ComponentType extends
		keyof MappedInteractionTypes = keyof MappedInteractionTypes,
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
	ComponentType extends
		keyof MappedInteractionTypes = keyof MappedInteractionTypes,
	ResponseType = ComponentType extends ComponentType.Button ? string : string[],
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
