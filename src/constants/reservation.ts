import {
	ActionRowBuilder,
	ChannelSelectMenuBuilder,
	EmbedBuilder,
} from "@discordjs/builders";
import { ChannelType, Colors, ComponentType } from "discord.js";
import dayjs from "dayjs";

import {
	type MessageComponentPromptOptions,
	type MessagePromptPropsOptions,
	InteractionEndReason,
	PromptFailError,
} from "#/libs/prompt";

export const channelOption: MessageComponentPromptOptions<ComponentType.ChannelSelect> =
	{
		type: "component",
		componentType: ComponentType.ChannelSelect,
		customId: "channel-select",
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
		timeout: 30_000,
	};

export const titleOption: MessagePromptPropsOptions = {
	type: "message",
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
	timeout: 30_000,
	retry: 2,
};

export const contentOption: MessagePromptPropsOptions = {
	type: "message",
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
	timeout: 30_000,
	retry: 2,
};

export const dateTimeOption: MessagePromptPropsOptions = {
	type: "message",
	requestPayload: {
		embeds: [
			new EmbedBuilder()
				.setTitle("✏️ 메시지 전송 일자 입력")
				.setDescription("날짜와 시간을 `YYYY-MM-DD HH:mm` 형식으로 입력하세요.")
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
	timeout: 30_000,
	retry: 2,
};
