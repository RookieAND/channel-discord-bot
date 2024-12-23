import { ApplyOptions } from "@sapphire/decorators";
import {
	isPrivateThreadChannel,
	isTextChannel,
} from "@sapphire/discord.js-utilities";
import {
	type ApplicationCommandRegistry,
	container,
} from "@sapphire/framework";
import { Subcommand } from "@sapphire/plugin-subcommands";
import dayjs from "dayjs";
import { hyperlink } from "discord.js";
import {
	ActionRowBuilder,
	ButtonBuilder,
	type ButtonInteraction,
	ButtonStyle,
	ChannelType,
	type ChatInputCommandInteraction,
	ComponentType,
	EmbedBuilder,
	PermissionsBitField,
	type PrivateThreadChannel,
	StringSelectMenuBuilder,
	type StringSelectMenuInteraction,
	type TextChannel,
	type User,
} from "discord.js";
import { delay, isNull, isUndefined } from "es-toolkit";
import { RESERVATION } from "#/constants/reservation";

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
	preconditions: ["GuildOnly"],
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
				idHints: ["1320295616789741618"],
			},
		);
	}

	/**
	 * 예약 메시지를 추가합니다.
	 */
	public async chatInputAdd(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
		if (!interaction.inCachedGuild()) {
			await interaction.reply({
				content: "명령어를 실행하는 과정에서 오류가 발생했습니다.",
				embeds: [
					new EmbedBuilder()
						.setTitle("❌ 길드 전용 명령어")
						.setDescription("이 명령어는 길드 내에서만 사용할 수 있습니다.")
						.setColor("Red"),
				],
				ephemeral: true,
			});
		}

		if (!isTextChannel(interaction.channel)) {
			await interaction.reply({
				content: "명령어를 실행하는 과정에서 오류가 발생했습니다.",
				embeds: [
					new EmbedBuilder()
						.setTitle("❌ 지원되지 않는 채널")
						.setDescription("이 명령어는 텍스트 채널에서만 사용할 수 있습니다.")
						.setColor("Red"),
				],
				ephemeral: true,
			});
			return;
		}

		const user = interaction.user;
		const thread = await interaction.channel.threads.create({
			name: `${interaction.user.id}-session`,
			autoArchiveDuration: 60,
			type: ChannelType.PrivateThread,
			invitable: false,
			reason: "사용자 세션 관리",
		});

		await interaction.reply({
			content: "쓰레드가 개설되었습니다. 내부에서 명령어 등록을 진행해주세요.",
			embeds: [
				new EmbedBuilder()
					.setTitle("📋 메세지 등록 진행")
					.setDescription(
						`${hyperlink("개설된 스레드", thread.url)} 내에서 메세지 등록을 진행해주세요.`,
					)
					.setColor("Blue"),
			],
			ephemeral: true,
		});

		if (!isPrivateThreadChannel(thread)) return;
		await thread.members.add(interaction.user.id);

		const selectedMode = await this.promptModeSelection(
			interaction,
			thread,
			user,
		);

		const selectChannelIds = await this.promptChannelList(
			interaction,
			thread,
			user,
		);

		await Promise.all([
			thread.send({
				embeds: [
					new EmbedBuilder()
						.setTitle("✅ 예약 메시지 추가 완료")
						.setDescription(
							// biome-ignore lint/style/noUnusedTemplateLiteral: <explanation>
							`예약 메시지가 성공적으로 추가되었습니다! (3초 후 Thread 가 닫힙니다.)`,
						)
						.setColor("Green"),
				],
			}),
			interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setTitle("✅ 예약 메시지 추가 완료")
						.setDescription(
							// biome-ignore lint/style/noUnusedTemplateLiteral: <explanation>
							`예약 메시지가 성공적으로 추가되었습니다! (ID: 테스트)`,
						)
						.setColor("Green"),
				],
			}),
		]);

		await delay(3_000);
		await thread.delete();

		// if (!selectMenuInteraction) {
		// 	await interaction.editReply({
		// 		content: "명령어를 실행하는 과정에서 오류가 발생했습니다.",
		// 		embeds: [
		// 			new EmbedBuilder()
		// 				.setTitle("⏳ 시간 초과")
		// 				.setDescription("시간이 초과되었습니다. 다시 시도해주세요.")
		// 				.setColor("Yellow"),
		// 		],
		// 	});
		// 	return;
		// }

		// const selectedChannelIds = selectMenuInteraction.values;
		// const selectedChannels = interaction.guild.channels.cache.filter(
		// 	(channel) => selectedChannelIds.includes(channel.id),
		// );

		// if (!selectedChannels.size) {
		// 	await interaction.editReply({
		// 		content: "명령어를 실행하는 과정에서 오류가 발생했습니다.",
		// 		embeds: [
		// 			new EmbedBuilder()
		// 				.setTitle("❌ 채널 없음")
		// 				.setDescription("선택한 채널을 찾을 수 없습니다.")
		// 				.setColor("Red"),
		// 		],
		// 	});
		// 	return;
		// }

		// const titleText = await this.promptTitle(interaction);

		// if (!titleText || titleText.length > 100) {
		// 	await interaction.editReply({
		// 		content: "명령어를 실행하는 과정에서 오류가 발생했습니다.",
		// 		embeds: [
		// 			new EmbedBuilder()
		// 				.setTitle("❌ 메시지 오류")
		// 				.setDescription(
		// 					"본문이 비어있거나 100자를 초과했습니다. 다시 시도해주세요.",
		// 				)
		// 				.setColor("Red"),
		// 		],
		// 	});
		// 	return;
		// }

		// const messageText = await this.promptContent(interaction);

		// if (!messageText || messageText.length > 2000) {
		// 	await interaction.editReply({
		// 		content: "명령어를 실행하는 과정에서 오류가 발생했습니다.",
		// 		embeds: [
		// 			new EmbedBuilder()
		// 				.setTitle("❌ 메시지 오류")
		// 				.setDescription(
		// 					"메시지가 비어있거나 2000자를 초과했습니다. 다시 시도해주세요.",
		// 				)
		// 				.setColor("Red"),
		// 		],
		// 	});
		// 	return;
		// }

		// const dateTime = await this.promptDateTime(interaction);

		// if (!dateTime) {
		// 	await interaction.editReply({
		// 		content: "명령어를 실행하는 과정에서 오류가 발생했습니다.",
		// 		embeds: [
		// 			new EmbedBuilder()
		// 				.setTitle("⏳ 시간 초과")
		// 				.setDescription("시간이 초과되었습니다. 다시 시도해주세요.")
		// 				.setColor("Yellow"),
		// 		],
		// 	});
		// 	return;
		// }

		// const recurring = await this.promptRecurringOptions(interaction);

		// if (!recurring) {
		// 	await interaction.editReply({
		// 		content: "명령어를 실행하는 과정에서 오류가 발생했습니다.",
		// 		embeds: [
		// 			new EmbedBuilder()
		// 				.setTitle("⏳ 시간 초과")
		// 				.setDescription("시간이 초과되었습니다. 다시 시도해주세요.")
		// 				.setColor("Yellow"),
		// 		],
		// 	});
		// 	return;
		// }

		// const scheduledTask = await container.tasks.create({
		// 	name: ScheduledTaskType.RESERVATION_MESSAGE,
		// 	payload: {
		// 		channelList: selectedChannelIds,
		// 		message: messageText,
		// 		owner: interaction.user.id,
		// 	},
		// });

		// await interaction.editReply({
		// 	embeds: [
		// 		new EmbedBuilder()
		// 			.setTitle("✅ 예약 메시지 추가 완료")
		// 			.setDescription(
		// 				`예약 메시지가 성공적으로 추가되었습니다! (ID: ${scheduledTask.id})`,
		// 			)
		// 			.setColor("Green"),
		// 	],
		// });
	}

	/**
	 * 예약 메시지를 제거합니다.
	 */
	public async chatInputRemove(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
		if (!interaction.inCachedGuild()) return;

		const reservationId = interaction.options.getString("id", true);

		try {
			await container.tasks.delete(reservationId);
			await interaction.reply({
				embeds: [
					new EmbedBuilder()
						.setTitle("✅ 제거 완료")
						.setDescription(
							`ID가 "${reservationId}"인 예약 메시지가 성공적으로 제거되었습니다.`,
						)
						.setColor("Green"),
				],
				ephemeral: true,
			});
		} catch {
			await interaction.reply({
				embeds: [
					new EmbedBuilder()
						.setTitle("❌ 제거 실패")
						.setDescription(
							`ID가 "${reservationId}"인 예약 메시지를 찾을 수 없습니다.`,
						)
						.setColor("Red"),
				],
				ephemeral: true,
			});
		}
	}

	/**
	 * 예약 메시지 목록을 확인합니다.
	 */
	public async chatInputList(
		interaction: Subcommand.ChatInputCommandInteraction,
	) {
		const tasks = await container.tasks.list({
			types: ["active", "waiting"],
		});

		const userTasks = tasks.filter(
			(task) => (task as any).payload.owner === interaction.user.id,
		);

		if (userTasks.length === 0) {
			await interaction.reply({
				embeds: [
					new EmbedBuilder()
						.setTitle("📭 예약 메시지 없음")
						.setDescription("등록된 예약 메시지가 없습니다.")
						.setColor("Blue"),
				],
				ephemeral: true,
			});
			return;
		}

		const embed = new EmbedBuilder()
			.setTitle("📋 예약 메시지 목록")
			.setDescription("아래는 등록된 예약 메시지 목록입니다:")
			.setColor("Blue")
			.setTimestamp();

		for (const task of userTasks) {
			embed.addFields([
				{
					name: `🆔 ID: ${task.id}`,
					value: `💬 **Message**: ${(task as any).payload.message}\n⏰ **Time**: ${dayjs(
						(task as any).options.delay,
					).format("YYYY-MM-DD HH:mm")}`,
					inline: false,
				},
			]);
		}

		await interaction.reply({
			embeds: [embed],
			ephemeral: true,
		});
	}

	private async closePromptTimeout(
		interaction: ChatInputCommandInteraction,
		thread: PrivateThreadChannel,
		title: string,
		reason: string,
	) {
		await interaction.editReply({
			content: "명령어를 실행하는 과정에서 오류가 발생했습니다.",
			embeds: [
				new EmbedBuilder()
					.setTitle(title)
					.setDescription(`${reason}. 3초 후 쓰레드가 닫힙니다.`)
					.setColor("Red"),
			],
		});
		await delay(3_000);
		await thread.delete();
		await interaction.deleteReply();
	}

	/**
	 * 채널 목록을 받는 Select Menu 생성
	 */
	private async promptChannelList(
		interaction: ChatInputCommandInteraction,
		thread: PrivateThreadChannel,
		user: User,
	) {
		const accessibleChannels = thread.guild.channels.cache.filter(
			(channel): channel is TextChannel =>
				channel.type === ChannelType.GuildText &&
				(channel
					.permissionsFor(user.id)
					?.has(PermissionsBitField.Flags.SendMessages) ??
					false),
		);

		const options = [...accessibleChannels.values()]
			.slice(0, 25)
			.map((channel) => ({
				label: channel.name,
				value: channel.id,
			}));

		const selectMenu =
			new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
				new StringSelectMenuBuilder()
					.setCustomId(RESERVATION.SELECT_MENU)
					.setPlaceholder("메시지를 보낼 채널을 선택해주세요.")
					.addOptions(options)
					.setMinValues(1)
					.setMaxValues(options.length),
			);

		const embed = new EmbedBuilder()
			.setTitle("📅 예약 메시지 추가")
			.setDescription("메시지를 보낼 채널을 선택해주세요.")
			.setColor("Blue");

		const message = await thread.send({
			embeds: [embed],
			components: [selectMenu],
		});

		const collector = thread.createMessageComponentCollector({
			componentType: ComponentType.StringSelect,
			filter: (i) => i.customId === RESERVATION.SELECT_MENU,
			time: TIMEOUT,
		});

		const selectMenuInteraction = await new Promise<
			StringSelectMenuInteraction | undefined
		>((resolve) => {
			collector.on("collect", (i) => {
				if (i.user.id === user.id) {
					collector.stop();
					resolve(i);
				}
			});

			collector.on("end", (_, reason) => {
				if (reason !== "user") resolve(undefined);
			});
		});

		await message.delete();

		if (isUndefined(selectMenuInteraction)) {
			await this.closePromptTimeout(
				interaction,
				thread,
				"⏳ 시간 초과",
				"시간이 초과되었습니다. 다시 시도해주세요.",
			);
			return "Unreachable Code";
		}

		return selectMenuInteraction.values;
	}

	private async promptDateTime(
		interaction: ChatInputCommandInteraction<"cached">,
	) {
		if (!interaction.channel) return;
		await interaction.reply({
			embeds: [
				new EmbedBuilder()
					.setTitle("📅 날짜와 시간 입력")
					.setDescription(
						"날짜와 시간을 `YYYY-MM-DD HH:mm` 형식으로 입력하세요.",
					)
					.setColor("Yellow"),
			],
		});

		const collected = await interaction.channel.awaitMessages({
			filter: (msg) => msg.author.id === interaction.user.id,
			max: 1,
			time: TIMEOUT,
		});

		return collected.first()?.content ?? null;
	}

	private async promptRecurringOptions(
		interaction: ChatInputCommandInteraction<"cached">,
	) {
		if (!interaction.channel) return;

		const selectMenu =
			new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
				new StringSelectMenuBuilder()
					.setCustomId("day-select")
					.setPlaceholder("요일을 선택하세요.")
					.addOptions([
						{ label: "월", value: "monday" },
						{ label: "화", value: "tuesday" },
						{ label: "수", value: "wednesday" },
						{ label: "목", value: "thursday" },
						{ label: "금", value: "friday" },
						{ label: "토", value: "saturday" },
						{ label: "일", value: "sunday" },
						{ label: "매일", value: "daily" },
					]),
			);

		const embed = new EmbedBuilder()
			.setTitle("📅 예약 메시지 추가")
			.setDescription("메시지를 보낼 채널을 선택해주세요.")
			.setColor("Blue");

		await interaction.reply({
			embeds: [embed],
			components: [selectMenu],
			ephemeral: true,
		});

		const collector = interaction.channel.createMessageComponentCollector({
			componentType: ComponentType.StringSelect,
			filter: (i) => i.customId === RESERVATION.SELECT_MENU,
			time: TIMEOUT,
		});

		const selectMenuInteraction =
			await new Promise<StringSelectMenuInteraction | null>((resolve) => {
				collector.on("collect", (i) => {
					if (i.user.id === interaction.user.id) {
						collector.stop();
						resolve(i);
					}
				});

				collector.on("end", (_, reason) => {
					if (reason !== "user") resolve(null);
				});
			});

		return selectMenuInteraction;
	}

	private async promptTitle(
		interaction: ChatInputCommandInteraction<"cached">,
	) {
		if (!interaction.channel) return;
		const message = await interaction.editReply({
			embeds: [
				new EmbedBuilder()
					.setTitle("✏️ 메시지 제목 입력")
					.setDescription("전송할 메시지 제목을 입력하세요.")
					.setColor("Blue"),
			],
		});

		const collected = await interaction.channel.awaitMessages({
			filter: (msg) => msg.author.id === interaction.user.id,
			max: 1,
			time: TIMEOUT,
		});

		await message.delete();
		return collected.first()?.content ?? null;
	}

	private async promptModeSelection(
		interaction: ChatInputCommandInteraction,
		thread: PrivateThreadChannel,
		user: User,
	) {
		const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId("reservation-message")
				.setLabel("예약 메시지")
				.setStyle(ButtonStyle.Primary),
			new ButtonBuilder()
				.setCustomId("single-message")
				.setLabel("단일 메시지")
				.setStyle(ButtonStyle.Secondary),
		);

		const message = await thread.send({
			embeds: [
				new EmbedBuilder()
					.setTitle("📋 메시지 유형 선택")
					.setDescription("예약 메시지 또는 단일 메시지 중 하나를 선택하세요.")
					.setColor("Blue"),
			],
			components: [actionRow],
		});

		const collector = message.createMessageComponentCollector({
			componentType: ComponentType.Button,
			filter: (i) =>
				["reservation-message", "single-message"].includes(i.customId),
			time: TIMEOUT,
			max: 1,
		});

		const selectModeInteraction = await new Promise<
			ButtonInteraction | undefined
		>((resolve) => {
			collector.on("collect", (i) => {
				if (i.user.id === user.id) {
					collector.stop();
					resolve(i);
				}
			});

			collector.on("end", (_, reason) => {
				if (reason !== "user") resolve(undefined);
			});
		});

		await message.delete();

		if (isUndefined(selectModeInteraction)) {
			await this.closePromptTimeout(
				interaction,
				thread,
				"⏳ 시간 초과",
				"시간이 초과되었습니다. 다시 시도해주세요. (3초 후 Thread 가 닫힙니다.)",
			);
			return;
		}

		await selectModeInteraction.reply({
			embeds: [
				new EmbedBuilder()
					.setTitle("✅ 메시지 유형 선택 완료")
					.setDescription("메시지 유형이 성공적으로 선택되었습니다.")
					.setColor("Green"),
			],
		});

		return selectModeInteraction.customId;
	}

	private async promptContent(
		interaction: ChatInputCommandInteraction<"cached">,
	) {
		if (!interaction.channel) return;
		await interaction.channel.send({
			embeds: [
				new EmbedBuilder()
					.setTitle("📜 메시지 내용 입력")
					.setDescription("전송할 메시지 내용을 입력하세요.")
					.setColor("Yellow"),
			],
		});

		const collected = await interaction.channel.awaitMessages({
			filter: (msg) => msg.author.id === interaction.user.id,
			max: 1,
			time: TIMEOUT,
		});

		return collected.first()?.content ?? null;
	}

	private async promptRoleSelection(
		interaction: ChatInputCommandInteraction<"cached">,
	) {
		if (!interaction.channel) return;

		const roles = interaction.channel.guild.roles.cache.map((role) => ({
			label: role.name,
			value: role.id,
		}));

		const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
			new StringSelectMenuBuilder()
				.setCustomId("role-select")
				.setPlaceholder("멘션할 역할을 선택하세요.")
				.addOptions(roles),
		);

		await interaction.channel.send({
			embeds: [
				new EmbedBuilder()
					.setTitle("🎭 역할 선택")
					.setDescription("멘션할 역할을 선택하세요.")
					.setColor("Purple"),
			],
			components: [row],
		});

		const collector = interaction.channel.createMessageComponentCollector({
			componentType: ComponentType.StringSelect,
			filter: (i) => i.customId === RESERVATION.SELECT_MENU,
			time: TIMEOUT,
		});

		const selectMenuInteraction =
			await new Promise<StringSelectMenuInteraction | null>((resolve) => {
				collector.on("collect", (i) => {
					if (i.user.id === interaction.user.id) {
						collector.stop();
						resolve(i);
					}
				});

				collector.on("end", (_, reason) => {
					if (reason !== "user") resolve(null);
				});
			});

		return selectMenuInteraction;
	}
}
