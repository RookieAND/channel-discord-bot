import { type ApplicationCommandRegistry, Command } from "@sapphire/framework";
import { ApplyOptions } from "@sapphire/decorators";
import { ChannelTypes, isTextChannel } from "@sapphire/discord.js-utilities";

@ApplyOptions<Command.Options>({
	name: "전체공지",
	description: "Announce a message to a channel",
	preconditions: ["GuildOnly"],
})
export class AnnounceCommand extends Command {
	public override registerApplicationCommands(
		registry: ApplicationCommandRegistry,
	) {
		registry.registerChatInputCommand(
			(builder) =>
				builder
					.setName(this.name)
					.setDescription(this.description)
					.addChannelOption((option) =>
						option
							.setName("channel")
							.setDescription("The channel to send the announcement to")
							.setRequired(true),
					)
					.addStringOption((option) =>
						option
							.setName("message")
							.setDescription("The message to announce")
							.setRequired(true),
					),
			{
				guildIds: ["1260871187941163030"],
				idHints: ["1317877023959679108", "1317877420442910760"],
			},
		);
	}

	public override async chatInputRun(
		interaction: Command.ChatInputCommandInteraction,
	) {
		if (!interaction.inCachedGuild()) return;

		const channel = interaction.options.getChannel("channel", true);
		const message = interaction.options.getString("message", true);

		if (!channel.isSendable()) {
			return await interaction.reply({
				content: "I can't send messages to that channel.",
				ephemeral: true,
			});
		}

		if (!isTextChannel(channel)) {
			return interaction.reply({
				content: "The provided channel is not a text channel.",
				ephemeral: true,
			});
		}

		await channel.send(message);
		return await interaction.reply({
			content: "Message sent!",
			ephemeral: true,
		});
	}
}
