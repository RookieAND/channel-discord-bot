import { ApplyOptions } from "@sapphire/decorators";
import {
	InteractionHandler,
	InteractionHandlerTypes,
} from "@sapphire/framework";
import {
	ActionRowBuilder,
	ModalBuilder,
	type StringSelectMenuInteraction,
	TextInputBuilder,
	TextInputStyle,
} from "discord.js";

import { RESERVATION } from "#/constants/reservation";
import dayjs from "#/utils/dayjs";

type ChannelSelectInteractionSome = { channelList: string[] };

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.SelectMenu,
})
export class ChannelSelectHandler extends InteractionHandler {
	public async run(
		interaction: StringSelectMenuInteraction,
		{ channelList }: ChannelSelectInteractionSome,
	): Promise<void> {
		const userId = interaction.user.id;

		this.container.localStorage.setField<{ channelIds: string[] }>({
			key: `${RESERVATION.STORAGE_KEY}-${userId}`,
			field: "channelIds",
			value: channelList,
		});

		const modal = this.createModal();
		await interaction.showModal(modal);
		await interaction.deleteReply();
	}

	public parse(interaction: StringSelectMenuInteraction) {
		if (interaction.customId === RESERVATION.SELECT_MENU) {
			return this.some({ channelList: interaction.values });
		}
		return this.none();
	}

	private createModal() {
		const modal = new ModalBuilder()
			.setCustomId(RESERVATION.MODAL)
			.setTitle("예약 메시지 설정");

		const messageInput = new TextInputBuilder()
			.setCustomId("message")
			.setLabel("전송할 메시지 내용을 입력하세요.")
			.setMaxLength(300)
			.setStyle(TextInputStyle.Paragraph);

		const timeInput = new TextInputBuilder()
			.setCustomId("time")
			.setLabel("전송 시간을 입력하세요 (YYYY-MM-DD HH:MM)")
			.setValue(dayjs().format("YYYY-MM-DD HH:mm"))
			.setStyle(TextInputStyle.Short);

		modal.addComponents(
			new ActionRowBuilder<TextInputBuilder>().addComponents(messageInput),
			new ActionRowBuilder<TextInputBuilder>().addComponents(timeInput),
		);

		return modal;
	}
}
