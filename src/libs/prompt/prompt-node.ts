import {
	Colors,
	type ComponentType,
	type GuildTextBasedChannel,
	type MappedComponentBuilderTypes,
	type MappedInteractionTypes,
	type Message,
	type MessageComponentType,
	type MessageCreateOptions,
	type User,
} from "discord.js";
import { EmbedBuilder, type ActionRowBuilder } from "@discordjs/builders";
import { isEmpty } from "es-toolkit/compat";

import { InteractionEndReason } from "./prompt.constants";
import { isPromptFailedError, PromptFailError } from "./prompt-error";

type MessagePromptRequestOptions = Omit<MessageCreateOptions, "components">;

interface MessagePromptNodeProps<ChannelType extends GuildTextBasedChannel> {
	channel: ChannelType;
	user: User;
	requestPayload: Omit<MessageCreateOptions, "components">;
	responsePayload: MessageCreateOptions;
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
	private responsePayload: MessageCreateOptions;
	private validate: (input: Message) => boolean;
	private retry?: number;
	private leftAttempts: number;

	constructor(props: MessagePromptNodeProps<ChannelType>) {
		this.channel = props.channel;
		this.user = props.user;
		this.timeout = props.timeout;
		this.requestPayload = props.requestPayload;
		this.responsePayload = props.responsePayload;
		this.retry = props.retry;
		this.leftAttempts = this.retry ?? 0;
		this.validate = props.validate;
	}

	private async collect(): Promise<Message> {
		const collector = this.channel.createMessageCollector({
			filter: (msg) => msg.author.id === this.user.id,
			time: this.timeout,
		});

		return new Promise<Message>((resolve, reject) => {
			collector.on("collect", (message) => {
				if (isEmpty(message.content)) {
					collector.stop(InteractionEndReason.NO_RESPONSE);
					return;
				}
				collector.stop(InteractionEndReason.SUCCESS);
			});

			collector.on("end", (collection, reason) => {
				if (reason === InteractionEndReason.SUCCESS && collection.size > 0) {
					const message = collection.first();
					if (message) {
						resolve(message);
						return;
					}
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
						description:
							"문답 과정에서 질문에 대한 응답을 입력하지 않았습니다.",
						type: InteractionEndReason.NO_RESPONSE,
					}),
				);
			});
		});
	}

	private async processPrompt() {
		while (!this.retry || this.leftAttempts > 0) {
			console.log(
				!this.retry || this.leftAttempts > 0,
				this.retry,
				this.leftAttempts,
			);
			try {
				const message = await this.collect();
				const isValid = this.validate?.(message);

				if (!isValid) {
					throw new PromptFailError({
						title: "유효하지 않은 응답",
						description: "문답 과정에서 입력한 값이 유효하지 않습니다.",
						type: InteractionEndReason.INVALID_RESPONSE,
					});
				}

				return message.content as ResponseType;
			} catch (error) {
				if (
					isPromptFailedError(error) &&
					error.type === InteractionEndReason.INVALID_RESPONSE
				) {
					this.leftAttempts -= 1;
					if (this.leftAttempts === 0) {
						throw new PromptFailError({
							title: "재시도 횟수 초과",
							description: "문답 과정에서 지정된 재시도 횟수를 초과했습니다.",
							type: InteractionEndReason.RETRY_LIMIT_REACHED,
						});
					}
					await this.channel.send({
						embeds: [
							new EmbedBuilder()
								.setColor(Colors.Red)
								.setTitle(error.title)
								.setDescription(
									`${error.description} (남은 횟수 : ${this.leftAttempts} / ${this.retry})`,
								)
								.toJSON(),
						],
					});
					continue;
				}
				throw error;
			}
		}
		throw new Error("Unreachable code");
	}

	async ask(): Promise<ResponseType> {
		await this.channel.send(this.requestPayload);
		const response = await this.processPrompt();
		await this.channel.send(this.responsePayload);
		return response;
	}
}

interface MessageComponentPromptRequestOptions<
	PromptComponentType extends MessageComponentType,
> extends Omit<MessageCreateOptions, "components"> {
	components: ActionRowBuilder<
		MappedComponentBuilderTypes[PromptComponentType]
	>[];
}

interface MessageComponentPromptNodeProps<
	ChannelType extends GuildTextBasedChannel,
	PromptComponentType extends MessageComponentType,
> {
	channel: ChannelType;
	componentType: PromptComponentType;
	user: User;
	requestPayload: MessageComponentPromptRequestOptions<PromptComponentType>;
	responsePayload: MessageCreateOptions;
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
	private responsePayload: MessageCreateOptions;
	private customId: string;
	private validate?: (
		input: MappedInteractionTypes<boolean>[PromptComponentType],
	) => boolean;
	private retry?: number;
	private leftAttempts: number;

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
		this.leftAttempts = this.retry ?? 0;
		this.validate = props.validate;
	}

	private handleResponse(
		interaction: MappedInteractionTypes<boolean>[PromptComponentType],
	) {
		if (interaction.isButton()) {
			return interaction.customId as ResponseType;
		}
		if (interaction.isAnySelectMenu()) {
			return interaction.values as ResponseType;
		}
		throw new Error("Unreachable Code Error");
	}

	private async collect(): Promise<
		MappedInteractionTypes<boolean>[PromptComponentType]
	> {
		const collector = this.channel.createMessageComponentCollector({
			componentType: this.componentType,
			filter: (interaction) =>
				interaction.user.id === this.user.id &&
				interaction.customId === this.customId,
			time: this.timeout,
		});

		return new Promise<MappedInteractionTypes<boolean>[PromptComponentType]>(
			(resolve, reject) => {
				collector.on("collect", () => {
					collector.stop(InteractionEndReason.SUCCESS);
				});

				collector.on("end", (collection, reason) => {
					if (reason === InteractionEndReason.SUCCESS && collection.size > 0) {
						const interaction = collection.first();
						if (interaction) {
							resolve(interaction);
							return;
						}
					}
					if (reason === InteractionEndReason.TIMEOUT) {
						reject(
							new PromptFailError({
								title: "시간 초과",
								description:
									"문답 과정에서 지정된 시간 내에 응답이 없었습니다.",
								type: InteractionEndReason.TIMEOUT,
							}),
						);
					}
					reject(
						new PromptFailError({
							title: "응답 없음",
							description:
								"문답 과정에서 질문에 대한 응답을 입력하지 않았습니다.",
							type: InteractionEndReason.NO_RESPONSE,
						}),
					);
				});
			},
		);
	}

	private async processPrompt() {
		while (!this.retry || this.leftAttempts > 0) {
			try {
				const interaction = await this.collect();
				const isValid = this.validate?.(interaction);

				if (!isValid) {
					throw new PromptFailError({
						title: "유효하지 않은 응답",
						description: "문답 과정에서 입력한 값이 유효하지 않습니다.",
						type: InteractionEndReason.INVALID_RESPONSE,
					});
				}

				return this.handleResponse(interaction);
			} catch (error) {
				if (
					isPromptFailedError(error) &&
					error.type === InteractionEndReason.INVALID_RESPONSE
				) {
					this.leftAttempts -= 1;
					if (this.leftAttempts === 0) {
						throw new PromptFailError({
							title: "재시도 횟수 초과",
							description: "문답 과정에서 지정된 재시도 횟수를 초과했습니다.",
							type: InteractionEndReason.RETRY_LIMIT_REACHED,
						});
					}
					await this.channel.send({
						embeds: [
							new EmbedBuilder()
								.setColor(Colors.Red)
								.setTitle(error.title)
								.setDescription(
									`${error.description} (남은 횟수 : ${this.leftAttempts} / ${this.retry})`,
								)
								.toJSON(),
						],
					});
					continue;
				}
				throw error;
			}
		}
		throw new Error("Unreachable code");
	}

	async ask(): Promise<ResponseType> {
		await this.channel.send(this.requestPayload);
		const response = await this.processPrompt();
		await this.channel.send(this.responsePayload);
		return response;
	}
}