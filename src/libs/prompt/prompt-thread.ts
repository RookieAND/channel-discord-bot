import {
	ChannelType,
	type MessageComponentType,
	type PrivateThreadChannel,
	type TextChannel,
	ThreadAutoArchiveDuration,
	type User,
} from "discord.js";
import { container } from "@sapphire/framework";
import {
	type BasePromptNodeProps,
	type MessagePromptNodeProps,
	type MessageComponentPromptNodeProps,
	MessageComponentPromptNode,
	MessagePromptNode,
} from "./prompt-node";
import { isPromptFailedError, PromptFailError } from "./prompt-error";
import { EmbedBuilder } from "@discordjs/builders";
import { Colors } from "discord.js";
import { delay } from "es-toolkit";
import { InteractionEndReason } from "./prompt.constants";

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
type AnyPromptContextMap = Record<string, any>;

export type MessagePromptPropsOptions = Omit<
	MessagePromptNodeProps<PrivateThreadChannel>,
	"user" | "channel" | "timeout"
> & { type: "message"; timeout?: number };

export type MessageComponentPromptOptions<
	PromptComponentType extends MessageComponentType,
> = Omit<
	MessageComponentPromptNodeProps<PrivateThreadChannel, PromptComponentType>,
	"user" | "channel" | "timeout"
> & { type: "component"; timeout?: number };

type PromptNodeProps = Omit<
	BasePromptNodeProps<PrivateThreadChannel>,
	"user" | "channel" | "timeout"
> & { type: "message" | "component", timeout?: number };

interface PromptThreadManagerProps<
	PromptContextMap extends AnyPromptContextMap,
	PromptKey extends keyof PromptContextMap = keyof PromptContextMap,
> {
	user: User;
	channel: TextChannel;
	threadArchiveDuration?: ThreadAutoArchiveDuration;
	threadCloseTime?: number;
	promptName: string;
	promptOptions: Record<PromptKey, PromptNodeProps>;
	promptTimeout: number;
	promptRetry?: number;
	onPromptStart?: (thread: PrivateThreadChannel) => void;
	onPromptEnd?: (
		thread: PrivateThreadChannel,
		context: PromptContextMap,
	) => void;
}

export class PromptThreadManager<
	PromptContextMap extends AnyPromptContextMap,
	PromptKey extends keyof PromptContextMap = keyof PromptContextMap,
> {
	private user: User;
	private channel: TextChannel;
	private promptName: string;
	private threadArchiveDuration: ThreadAutoArchiveDuration;
	private threadCloseTime: number;
	private promptOptions: Record<PromptKey, PromptNodeProps>;
	private promptTimeout: number;
	private promptRetry?: number;
	private promptContext: PromptContextMap;

	private onThreadStart?: (thread: PrivateThreadChannel) => void;
	private onThreadEnd?: (
		thread: PrivateThreadChannel,
		context: PromptContextMap,
	) => void;

	constructor(props: PromptThreadManagerProps<PromptContextMap, PromptKey>) {
		this.channel = props.channel;
		this.user = props.user;
		this.promptName = props.promptName;
		this.threadCloseTime = props.threadCloseTime ?? 3_000;
		this.threadArchiveDuration =
			props.threadArchiveDuration ?? ThreadAutoArchiveDuration.OneHour;
		this.promptOptions = props.promptOptions;
		this.promptTimeout = props.promptTimeout;
		this.promptRetry = props.promptRetry;
		this.promptContext = {} as PromptContextMap;

		this.onThreadStart = props.onPromptStart;
		this.onThreadEnd = props.onPromptEnd;
	}

	private async generateJoinThreadMessage() {
		const thread = await this.channel.threads.create({
			name: `[${this.promptName}] ${this.user.id}-${Date.now()}`,
			autoArchiveDuration: this.threadArchiveDuration,
			type: ChannelType.PrivateThread,
			invitable: false,
		});
		await thread.members.add(this.user.id);
		return thread;
	}

	private isMessageComponentPromptNodeProps(
		props: PromptNodeProps,
	): props is MessageComponentPromptOptions<MessageComponentType> {
		return props.type === "component";
	}

	private isMessagePromptNodeProps(
		props: PromptNodeProps,
	): props is MessagePromptPropsOptions {
		return props.type === "message";
	}

	private async createPromptNode(
		promptOption: PromptNodeProps,
		thread: PrivateThreadChannel,
	) {
		const timeout = promptOption.timeout ?? this.promptTimeout;
		const retry = promptOption.retry ?? this.promptRetry;

		if (this.isMessageComponentPromptNodeProps(promptOption)) {
			return new MessageComponentPromptNode<
				PromptContextMap[PromptKey],
				PrivateThreadChannel
			>({
				...promptOption,
				channel: thread,
				user: this.user,
				timeout,
				retry,
			});
		}

		if (this.isMessagePromptNodeProps(promptOption)) {
			return new MessagePromptNode<
				PromptContextMap[PromptKey],
				PrivateThreadChannel
			>({
				...promptOption,
				channel: thread,
				user: this.user,
				timeout,
				retry,
			});
		}

		throw new PromptFailError({
			title: "올바르지 않은 Prompt 타입입니다.",
			description:
				"올바르지 않은 Prompt 타입입니다. ('message' 또는 'component'만 가능)",
			type: InteractionEndReason.UNEXPECTED_ERROR,
		});
	}

	private getErrorDetailReason(error: unknown) {
		if (isPromptFailedError(error)) {
			return error.getDetailReason();
		}
		return {
			title: "시스템 오류",
			description: "문답 진행 중 알 수 없는 오류가 발생했습니다.",
		};
	}

	async start() {
		const thread = await this.generateJoinThreadMessage();
		const threadChannel = thread as PrivateThreadChannel;
		this.onThreadStart?.(threadChannel);
	
		try {
			for (const [key, promptOptions] of Object.entries(this.promptOptions) as [
				PromptKey,
				PromptNodeProps,
			][]) {
				const prompt = await this.createPromptNode(
					promptOptions,
					threadChannel,
				);

				const response = await prompt.ask();
				this.promptContext[key] = response;
			}
		} catch (error) {
			const { title, description } = this.getErrorDetailReason(error);
			await threadChannel.send({
				embeds: [
					new EmbedBuilder()
						.setTitle(title)
						.setDescription(description)
						.setColor(Colors.Red),
				],
			});
			container.logger.error(error);
		}

		this.onThreadEnd?.(threadChannel, this.promptContext);
		await delay(this.threadCloseTime);
		await threadChannel.delete();

		return this.promptContext;
	}
}
