import {
	type ButtonInteraction,
	type ChannelSelectMenuInteraction,
	ComponentType,
	type InteractionCollector,
	type MappedInteractionTypes,
	type MentionableSelectMenuInteraction,
	type MessageComponentType,
	type RoleSelectMenuInteraction,
	type StringSelectMenuInteraction,
	type TextChannel,
	type UserSelectMenuInteraction,
} from "discord.js";

type InteractionMapping = {
	[ComponentType.StringSelect]: StringSelectMenuInteraction;
	[ComponentType.UserSelect]: UserSelectMenuInteraction;
	[ComponentType.RoleSelect]: RoleSelectMenuInteraction;
	[ComponentType.MentionableSelect]: MentionableSelectMenuInteraction;
	[ComponentType.ChannelSelect]: ChannelSelectMenuInteraction;
	[ComponentType.Button]: ButtonInteraction;
};

/**
 * Select Menu Interaction 수집
 */
export async function collectComponentInteraction<
	T extends MessageComponentType,
>(
	channel: TextChannel,
	componentType: T,
	filter: InteractionCollector<MappedInteractionTypes<boolean>[T]>["filter"],
	timeout: number,
) {
	const collector = channel.createMessageComponentCollector({
		componentType,
		filter,
		time: timeout,
	});

	return new Promise<InteractionMapping[T] | null>((resolve) => {
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
}
