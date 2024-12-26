import type {
	ComponentType,
	GuildTextBasedChannel,
	MappedInteractionTypes,
	Message,
	User,
} from "discord.js";
import { isUndefined } from "es-toolkit";

enum InteractionEndReason {
	TIMEOUT = "timeout",
	RETRY_LIMIT_REACHED = "retry_limit_reached",
	NO_RESPONSE = "no_response",
	SUCCESS = "success",
}

type InteractionFailedReason = Exclude<
	InteractionEndReason,
	InteractionEndReason.SUCCESS
>;

class InteractionFailedError extends Error {
	type: InteractionFailedReason;
	constructor(message: string, type: InteractionFailedReason) {
		super(message);
		this.type = type;
	}
}

export const isInteractionFailedError = (
	error: unknown,
): error is InteractionFailedError => {
	return error instanceof InteractionFailedError;
};

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
					new InteractionFailedError(
						"Retry limit reached",
						InteractionEndReason.RETRY_LIMIT_REACHED,
					),
				);
			}
			if (reason === InteractionEndReason.TIMEOUT) {
				reject(
					new InteractionFailedError("Timeout", InteractionEndReason.TIMEOUT),
				);
			}
			reject(
				new InteractionFailedError(
					"No Response",
					InteractionEndReason.NO_RESPONSE,
				),
			);
		});
	});

	return response;
};

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
			if (!validate || validate(interaction)) {
				collector.stop(InteractionEndReason.SUCCESS);
				return;
			}
			if (leftAttempts > 0) {
				leftAttempts -= 1;
				interaction.update({ content: "Invalid input", components: [] });
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
				reject(
					new InteractionFailedError("Timeout", InteractionEndReason.TIMEOUT),
				);
			}
			reject(
				new InteractionFailedError(
					"No Response",
					InteractionEndReason.NO_RESPONSE,
				),
			);
		});
	});

	return { response, interaction };
};
