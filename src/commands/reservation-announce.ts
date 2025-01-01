import { ApplyOptions } from "@sapphire/decorators";
import {
	isTextChannel,
	PaginatedMessage,
} from "@sapphire/discord.js-utilities";
import {
	type ApplicationCommandRegistry,
	container,
} from "@sapphire/framework";
import { Subcommand } from "@sapphire/plugin-subcommands";
import {
	ButtonBuilder,
	ChannelSelectMenuBuilder,
	EmbedBuilder,

} from "@discordjs/builders";
import dayjs from "dayjs";
import {
	ActionRowBuilder,
	ChannelType,
	ComponentType,
	Colors,
	hyperlink,
	type PrivateThreadChannel,
	type User,
	ButtonStyle,
} from "discord.js";
import { chunk } from "es-toolkit";

import {
	channelOption,
	titleOption,
	contentOption,
	dateTimeOption,
} from "#/constants/reservation";
import {
	InteractionEndReason,
	MessageComponentPromptNode,
	MessagePromptNode,
	PromptFailError,
} from "#/libs/prompt";
import {
	scheduleTaskRepository,
	type ScheduleTaskDocs,
} from "#/databases/collections/schedule-task";
import { ScheduledTaskType } from "#/types/schedule-task.type";
import { PromptThreadManager } from "#/libs/prompt/prompt-thread";

const TIMEOUT = 30000;

@ApplyOptions<Subcommand.Options>({
	name: "reservation",
	description: "예약 메시지와 관련된 명령어입니다.",
	subcommands: [
		{
			name: "add",
			chatInputRun: "chatInputAdd",
		},
		{
			name: "remove",
			chatInputRun: "chatInputRemove",
		},
		{
			name: "list",
			chatInputRun: "chatInputList",
		},
	],
	preconditions: ["GuildTextOnly"],
})
export class ReservationCommand extends Subcommand {
	public override registerApplicationCommands(
		registry: ApplicationCommandRegistry,
	) {
		registry.registerChatInputCommand(
			(builder) =>
				builder
					.setName(this.name)
					.setDescription(this.description)
					.addSubcommand((sub) =>
						sub.setName("add").setDescription("예약 메시지를 추가합니다."),
					)
					.addSubcommand((sub) =>
						sub
							.setName("list")
							.setDescription("등록된 예약 메시지를 확인합니다."),
					)
					.addSubcommand((sub) =>
						sub
							.setName("remove")
							.setDescription("등록된 예약 메시지를 제거합니다.")
							.addStringOption((option) =>
								option
									.setName("id")
									.setDescription("제거할 예약 메시지의 ID를 입력하세요.")
									.setRequired(true),
							),
					),
			{
				idHints: ["1321801903230943273"],
			},
		);
	}

	/**
	 * 예약 메시지를 추가합니다.
	 */
	public async chatInputAdd(
		interaction: Subcommand.ChatInputCommandInteraction<"cached">,
	) {
		if (!isTextChannel(interaction.channel)) {
			await interaction.reply({
				content: "명령어를 실행하는 과정에서 오류가 발생했습니다.",
				embeds: [
					new EmbedBuilder()
						.setTitle("❌ 지원되지 않는 채널")
						.setDescription("이 명령어는 텍스트 채널에서만 사용할 수 있습니다.")
						.setColor(Colors.Red),
				],
				ephemeral: true,
			});
			return;
		}

		const user = interaction.user;
		const promptManager = new PromptThreadManager<{
			channels: string[];
			title: string;
			content: string;
			dateTime: string;
		}>({
			user,
			channel: interaction.channel,
			promptName: "reservation-prompt",
			promptTimeout: 30_000,
			promptOptions: {
				channels: channelOption,
				title: titleOption,
				content: contentOption,
				dateTime: dateTimeOption,
			},
			onPromptStart: async (thread) => {
				await interaction.reply({
					content: "쓰레드가 개설되었습니다. 내부에서 문답을 진행해주세요.",
					components: [
						new ActionRowBuilder<ButtonBuilder>().addComponents(
							new ButtonBuilder()
								.setLabel("쓰레드로 이동하기")
								.setStyle(ButtonStyle.Link)
								.setURL(thread.url),
						),
					],
					embeds: [
						new EmbedBuilder()
							.setTitle("📋 메세지 등록 진행")
							.setDescription(
								`${hyperlink(
									"개설된 스레드",
									thread.url,
								)} 내에서 메시지 등록을 진행해주세요.`,
							)
							.setColor(Colors.Blue),
					],
					ephemeral: true,
				});
			},
			onPromptEnd: async (thread, context) => {
				const reservationTime = dayjs(
					context.dateTime,
					"YYYY-MM-DD HH:mm",
					true,
				);
				const taskData = {
					title: context.title,
					content: context.content,
					owner: user.id,
					channelList: context.channels,
				};

				const reservationDocument = await scheduleTaskRepository.create({
					time: reservationTime.toDate(),
					taskType: ScheduledTaskType.RESERVATION_MESSAGE,
					taskData,
				});

				container.tasks.create(
					{
						name: ScheduledTaskType.RESERVATION_MESSAGE,
						payload: taskData,
					},
					{
						repeated: false,
						delay: reservationTime.diff(dayjs(), "millisecond"),
						customJobOptions: {
							jobId: reservationDocument.id,
						},
					},
				);

				const successMessageCreationOption = {
					components: [],
					embeds: [
						new EmbedBuilder()
							.setTitle("✅ 예약 메시지 추가 완료")
							.setDescription("예약 메시지가 성공적으로 추가되었습니다!")
							.addFields([
								{
									name: "발송 시간",
									value: reservationTime.format("YYYY/MM/DD HH:mm"),
								},
								{ name: "명령어 ID", value: reservationDocument.id },
							])
							.setColor(Colors.Green),
					],
				};

				await Promise.all([
					interaction.editReply(successMessageCreationOption),
					thread.send(successMessageCreationOption),
				]);
			},
		});

		await promptManager.start();
	}

	/**
	 * 예약 메시지를 제거합니다.
	 */
	public async chatInputRemove(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
		if (!interaction.inCachedGuild()) return;

		const reservationId = interaction.options.getString("id", true);
		const reservationDocument =
			await scheduleTaskRepository.findById(reservationId);
		if (!reservationDocument) {
			await interaction.reply({
				embeds: [
					new EmbedBuilder()
						.setTitle("❌ 제거 실패")
						.setDescription(
							`ID가 "${reservationId}"인 예약 메시지를 찾을 수 없습니다.`,
						)
						.setColor(Colors.Red),
				],
				ephemeral: true,
			});
			return;
		}

		await scheduleTaskRepository.removeById(reservationId);
		await container.tasks.delete(reservationId);
		await interaction.reply({
			embeds: [
				new EmbedBuilder()
					.setTitle("✅ 명령어 제거 완료")
					.setDescription(
						`ID가 : "${reservationId}" 예약 메시지가 성공적으로 제거되었습니다.`,
					)
					.setColor(Colors.Green),
			],
			ephemeral: true,
		});
	}

	/**
	 * 예약 메시지 목록을 확인합니다.
	 */
	public async chatInputList(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
		const availableReservationTask =
			await scheduleTaskRepository.findAvailableTaskByType(
				ScheduledTaskType.RESERVATION_MESSAGE,
			);

		const paginatedMessage = new PaginatedMessage({
			template: {
				content: "등록된 예약 메세지를 보여줍니다",
				embeds: [
					new EmbedBuilder()
						.setColor(Colors.Blue)
						.setTitle("📋 예약 메시지 목록"),
				],
			},
		});

		const formatReservationTaskInformation = (
			reservationDocs: ScheduleTaskDocs,
		) =>
			`ID : ${reservationDocs.id} (발송 시간 : ${dayjs(reservationDocs.time).format("YYYY/MM/DD HH시 mm분")})`;

		for (const page of chunk(availableReservationTask, 10)) {
			paginatedMessage.addPageEmbed((embed) =>
				embed.setDescription(
					page
						.map((reservationDocs) =>
							formatReservationTaskInformation(reservationDocs),
						)
						.join("\n"),
				),
			);
		}

		await paginatedMessage.run(interaction);
	}

	/**
	 * 채널 목록을 받는 Select Menu 생성
	 */
	private getPromptChannelList(thread: PrivateThreadChannel, user: User) {
		const promptNode = new MessageComponentPromptNode({
			channel: thread,
			componentType: ComponentType.ChannelSelect,
			user,
			timeout: 30_000,
			requestPayload: {
				embeds: [
					new EmbedBuilder()
						.setTitle("📅 예약 메시지 추가")
						.setDescription("메시지를 보낼 채널을 선택해주세요.")
						.setColor(Colors.Blue),
				],
				components: [
					new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
						new ChannelSelectMenuBuilder()
							.setCustomId("channel-select")
							.setPlaceholder("메시지를 보낼 채널을 선택해주세요.")
							.setChannelTypes(ChannelType.GuildText)
							.setMinValues(1)
							.setMaxValues(10),
					),
				],
			},
			responsePayload: {
				embeds: [
					new EmbedBuilder()
						.setTitle("✅ 채널 선택 완료")
						.setDescription("채널이 성공적으로 선택되었습니다.")
						.setColor(Colors.Green),
				],
			},
			customId: "channel-select",
		});

		return promptNode;
	}

	private getPromptDateTime(thread: PrivateThreadChannel, user: User) {
		const reserveDateTimePrompt = new MessagePromptNode({
			channel: thread,
			user,
			timeout: TIMEOUT,
			requestPayload: {
				embeds: [
					new EmbedBuilder()
						.setTitle("✏️ 메시지 전송 일자 입력")
						.setDescription(
							"날짜와 시간을 `YYYY-MM-DD HH:mm` 형식으로 입력하세요.",
						)
						.setColor(Colors.Blue),
				],
			},
			responsePayload: {
				embeds: [
					new EmbedBuilder()
						.setTitle("✅ 전송 시간 설정 완료")
						.setDescription("메시지를 전송할 시간을 성공적으로 설정했습니다.")
						.setColor(Colors.Green),
				],
			},
			validate: (message) => {
				if (!dayjs(message.content, "YYYY-MM-DD HH:mm", true).isValid()) {
					throw new PromptFailError({
						title: "❌ 시간 입력 오류",
						description: "YYYY-MM-DD HH:mm 형식에 맞춰 시간을 입력해주세요.",
						type: InteractionEndReason.INVALID_RESPONSE,
					});
				}
				return true;
			},
			retry: 2,
		});

		return reserveDateTimePrompt;
	}

	private getPromptTitle(thread: PrivateThreadChannel, user: User) {
		const titlePrompt = new MessagePromptNode({
			channel: thread,
			user,
			timeout: TIMEOUT,
			requestPayload: {
				embeds: [
					new EmbedBuilder()
						.setTitle("✏️ 메시지 제목 입력")
						.setDescription("전송할 메시지 제목을 입력하세요.")
						.setColor(Colors.Blue),
				],
			},
			responsePayload: {
				embeds: [
					new EmbedBuilder()
						.setTitle("✅ 메시지 제목 입력 완료")
						.setDescription("메시지 제목이 성공적으로 입력되었습니다.")
						.setColor(Colors.Green),
				],
			},
			validate: (message) => {
				if (message.content.length > 100) {
					throw new PromptFailError({
						title: "❌ 메시지 오류",
						description: "메시지 제목이 100자를 초과했습니다.",
						type: InteractionEndReason.INVALID_RESPONSE,
					});
				}
				return true;
			},
			retry: 2,
		});

		return titlePrompt;
	}

	private getPromptContent(thread: PrivateThreadChannel, user: User) {
		const contentPrompt = new MessagePromptNode({
			channel: thread,
			user,
			timeout: TIMEOUT,
			requestPayload: {
				embeds: [
					new EmbedBuilder()
						.setTitle("✏️ 메시지 내용 입력")
						.setDescription("전송할 메시지 내용을 입력하세요.")
						.setColor(Colors.Blue),
				],
			},
			responsePayload: {
				embeds: [
					new EmbedBuilder()
						.setTitle("✅ 메시지 내용 입력 완료")
						.setDescription("메시지 내용이 성공적으로 입력되었습니다.")
						.setColor(Colors.Green),
				],
			},
			validate: (message) => {
				if (message.content.length > 2000) {
					throw new PromptFailError({
						title: "❌ 메시지 오류",
						description: "메시지 내용이 2000자를 초과했습니다.",
						type: InteractionEndReason.INVALID_RESPONSE,
					});
				}
				return true;
			},
			retry: 2,
		});

		return contentPrompt;
	}
}
