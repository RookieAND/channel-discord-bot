import { ApplyOptions } from "@sapphire/decorators";
import {
	type ApplicationCommandRegistry,
	Command,
	type CommandOptions,
} from "@sapphire/framework";
import {
	ActionRowBuilder,
	ChannelType,
	type ChatInputCommandInteraction,
	type CommandInteraction,
	PermissionsBitField,
	StringSelectMenuBuilder,
	type TextChannel,
} from "discord.js";

import { RESERVATION } from "#/constants/reservation";

@ApplyOptions<CommandOptions>({
	name: "reservation",
	description: "예약 메시지를 설정하는 명령어입니다.",
	preconditions: ["GuildOnly"],
})
export class ReservationCommand extends Command {
	public override registerApplicationCommands(
		registry: ApplicationCommandRegistry,
	) {
		registry.registerChatInputCommand(
			(builder) => builder.setName(this.name).setDescription(this.description),
			{
				idHints: ["1320295616789741618"],
			},
		);
	}

	public async chatInputRun(interaction: ChatInputCommandInteraction) {
		if (!interaction.inCachedGuild()) return;

		const accessibleChannels = interaction.guild.channels.cache.filter(
			(channel): channel is TextChannel =>
				channel.type === ChannelType.GuildText &&
				(channel
					.permissionsFor(interaction.user)
					?.has(PermissionsBitField.Flags.SendMessages) ??
					false),
		);

		if (!accessibleChannels.size) {
			await interaction.reply({
				content: "유효한 채널이 없습니다.",
				ephemeral: true,
			});
			return;
		}

		this.container.localStorage.delete({
			key: `${RESERVATION.STORAGE_KEY}-${interaction.user.id}`,
		});

		const selectMenu = this.createSelectMenu(interaction);
		await interaction.reply({
			content: "메세지를 전송할 채널을 선택하세요.",
			components: [selectMenu],
			ephemeral: true,
		});
	}

	/**
	 * Select Menu 생성
	 */
	private createSelectMenu(interaction: CommandInteraction<"cached">) {
		const accessibleChannels = interaction.guild.channels.cache.filter(
			(channel): channel is TextChannel =>
				channel.type === ChannelType.GuildText &&
				(channel
					.permissionsFor(interaction.user)
					?.has(PermissionsBitField.Flags.SendMessages) ??
					false),
		);

		const options = [...accessibleChannels.values()]
			.slice(0, 25)
			.map((channel) => ({
				label: channel.name,
				value: channel.id,
			}));

		return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
			new StringSelectMenuBuilder()
				.setCustomId(RESERVATION.SELECT_MENU)
				.setPlaceholder("메시지를 보낼 채널을 선택해주세요.")
				.addOptions(options)
				.setMinValues(1)
				.setMaxValues(options.length),
		);
	}
}
