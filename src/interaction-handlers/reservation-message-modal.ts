import { ApplyOptions } from "@sapphire/decorators";
import {
	InteractionHandler,
	InteractionHandlerTypes,
	container,
} from "@sapphire/framework";
import { EmbedBuilder, type ModalSubmitInteraction } from "discord.js";
import dayjs from "#/utils/dayjs";

import { RESERVATION } from "#/constants/reservation";
import { ScheduledTaskType } from "#/types/schedule-task.type";

type ReservationModalInteractionSome = {
	message: string;
	time: string;
};

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.ModalSubmit,
})
export class ReservationModalHandler extends InteractionHandler {
	public async run(
		interaction: ModalSubmitInteraction,
		{ message, time }: ReservationModalInteractionSome,
	) {
		if (!interaction.inCachedGuild()) return;
		const isValidTime = dayjs(time, "YYYY-MM-DD HH:mm", true).isValid();

		if (!isValidTime) {
			return interaction.reply({
				content: "올바른 시간 형식을 입력해주세요.",
				ephemeral: true,
			});
		}

		const userId = interaction.user.id;

		const channelIdList = this.container.localStorage.getField<{
			channelIds: string[];
		}>({
			key: `${RESERVATION.STORAGE_KEY}-${userId}`,
			field: "channelIds",
		});

		if (channelIdList?.length === 0) {
			return interaction.reply({
				content: "채널 정보를 찾을 수 없습니다.",
				ephemeral: true,
			});
		}

		const channelNames = await this.fetchChannelNames(
			interaction,
			channelIdList,
		);

		const embed = this.createEmbed({ channelNames, message, time });

		await container.tasks.create(
			{
				name: ScheduledTaskType.RESERVATION_MESSAGE,
				payload: { channelList: channelIdList, owner: userId, message },
			},
			{
				repeated: false,
				delay: dayjs().diff(dayjs(time, "YYYY-MM-DD HH:mm"), "milliseconds"),
			},
		);

		// 데이터 삭제
		this.container.localStorage.delete({
			key: `${RESERVATION.STORAGE_KEY}-${userId}`,
		});

		await interaction.reply({
			embeds: [embed],
			ephemeral: true,
		});
	}

	private async fetchChannelNames(
		interaction: ModalSubmitInteraction<"cached">,
		channelIdList: string[],
	) {
		const currentGuildChannel = interaction.guild.channels.cache;
		const channelNames = channelIdList
			.map((channelId) => currentGuildChannel.get(channelId)?.name)
			.filter(Boolean);
		return channelNames as string[];
	}

	private createEmbed({
		channelNames,
		message,
		time,
	}: { channelNames: string[]; message: string; time: string }) {
		const embed = new EmbedBuilder()
			.setTitle("예약 메시지 설정 완료")
			.addFields(
				{
					name: "채널",
					value: channelNames.join("\n"),
					inline: false,
				},
				{ name: "메시지", value: message, inline: false },
				{ name: "시간", value: time, inline: true },
			)
			.setColor("#00AAFF");

		return embed;
	}

	public parse(interaction: ModalSubmitInteraction) {
		if (interaction.customId === "reservation-modal") {
			const message = interaction.fields.getTextInputValue("message");
			const time = interaction.fields.getTextInputValue("time");

			return this.some({ message, time });
		}
		return this.none();
	}
}
