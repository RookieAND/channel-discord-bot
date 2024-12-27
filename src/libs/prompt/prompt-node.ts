import type {
	ActionRowData,
	ComponentType,
	GuildTextBasedChannel,
	MappedComponentBuilderTypes,
	MappedInteractionTypes,
	Message,
	MessageComponentType,
	MessageCreateOptions,
	MessageEditOptions,
	User,
} from "discord.js";
import type { ActionRowBuilder } from "@discordjs/builders";

import { collectMessage } from "./collect-message";
import { collectMessageComponent } from "./collect-component";

type MessagePromptRequestOptions = Omit<MessageCreateOptions, "components">;

interface MessagePromptNodeProps<ChannelType extends GuildTextBasedChannel> {
	channel: ChannelType;
	user: User;
	requestPayload: Omit<MessageCreateOptions, "components">;
	responsePayload: MessageEditOptions;
	validate: (input: Message) => boolean;
	timeout: number;
	retry?: number;
}

export class MessagePromptNode<
	ChannelType extends GuildTextBasedChannel,
	ResponseType extends string = string,
> {
	private channel: ChannelType;
	private user: User;
	private timeout: number;
	private requestPayload: MessagePromptRequestOptions;
	private responsePayload: MessageEditOptions;
	private validate: (input: Message) => boolean;
	private retry?: number;

	constructor(props: MessagePromptNodeProps<ChannelType>) {
		this.channel = props.channel;
		this.user = props.user;
		this.timeout = props.timeout;
		this.requestPayload = props.requestPayload;
		this.responsePayload = props.responsePayload;
		this.retry = props.retry;
		this.validate = props.validate;
	}

	async ask(): Promise<ResponseType> {
		const requestMessage = await this.channel.send(this.requestPayload);
		const response = await collectMessage<ChannelType, ResponseType>({
			channel: this.channel,
			user: this.user,
			validate: this.validate,
			timeout: this.timeout,
			retry: this.retry,
		});
		await requestMessage.edit(this.responsePayload);
		return response;
	}
}

interface MessageComponentPromptRequestOptions<
	PromptComponentType extends MessageComponentType,
> extends Omit<MessageCreateOptions, "components"> {
	components: ActionRowBuilder<MappedComponentBuilderTypes[PromptComponentType]>[];
}

interface MessageComponentPromptNodeProps<
	ChannelType extends GuildTextBasedChannel,
	PromptComponentType extends MessageComponentType,
> {
	channel: ChannelType;
    componentType: PromptComponentType;
	user: User;
	requestPayload: MessageComponentPromptRequestOptions<PromptComponentType>;
	responsePayload: MessageEditOptions;
    customId: string;
	validate?: (input: MappedInteractionTypes[PromptComponentType]) => boolean;
	timeout: number;
	retry?: number;
}

export class MessageComponentPromptNode<
	ChannelType extends GuildTextBasedChannel,
	PromptComponentType extends MessageComponentType,
	ResponseType extends PromptComponentType extends ComponentType.Button
		? string
		: string[],
> {
	private channel: ChannelType;
    private componentType: PromptComponentType;
	private user: User;
	private timeout: number;
	private requestPayload: MessageComponentPromptRequestOptions<PromptComponentType>;
	private responsePayload: MessageEditOptions;
    private customId: string;
	private validate?: (input: MappedInteractionTypes[PromptComponentType]) => boolean;
	private retry?: number;

	constructor(
		props: MessageComponentPromptNodeProps<ChannelType, PromptComponentType>,
	) {
        const messageComponent = props.requestPayload.components[0].components[0];
        messageComponent.setCustomId(props.customId);

		this.channel = props.channel;
        this.componentType = props.componentType;
		this.user = props.user;
		this.timeout = props.timeout;
		this.requestPayload = props.requestPayload;
		this.responsePayload = props.responsePayload;
        this.customId = props.customId;
		this.retry = props.retry;
		this.validate = props.validate;
	}

	async ask(): Promise<ResponseType> {
		const requestMessage = await this.channel.send(this.requestPayload);
		const response = await collectMessageComponent<PromptComponentType, ResponseType>({
			message: requestMessage,
            componentType: this.componentType,
            customId: this.customId,
			user: this.user,
			validate: this.validate,
			timeout: this.timeout,
			retry: this.retry,
		});
		await requestMessage.edit(this.responsePayload);
		return response;
	}
}
