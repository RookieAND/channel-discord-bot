import { ApplyOptions } from "@sapphire/decorators";
import { isTextChannel } from "@sapphire/discord.js-utilities";
import { ScheduledTask } from "@sapphire/plugin-scheduled-tasks";
import { EmbedBuilder, Status } from "discord.js";
import {
	type ScheduledTaskData,
	ScheduledTaskType,
} from "#/types/schedule-task.type";

@ApplyOptions<ScheduledTask.Options>({
	name: ScheduledTaskType.RESERVATION_MESSAGE,
})
export class ReservationScheduledTask extends ScheduledTask<ScheduledTaskType.RESERVATION_MESSAGE> {
	public async run(
		payload: ScheduledTaskData[ScheduledTaskType.RESERVATION_MESSAGE],
	) {
		if (this.container.client.ws.status !== Status.Ready) {
			return;
		}

		const { channelList, owner, message } = payload;

		const sendChannelList = this.container.client.channels.cache.filter(
			(channel) => channelList.includes(channel.id),
		);

		const embed = this.createEmbed({ owner, message });
		for (const channel of sendChannelList.values()) {
			if (!isTextChannel(channel)) return;
			try {
				await channel.send({ embeds: [embed] });
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : error;
				this.container.logger.error(
					`Failed to send message to channel ${channel.id}: ${errorMessage}`,
				);
			}
		}
	}

	private createEmbed({
		owner,
		message,
	}: {
		owner: string;
		message: string;
	}) {
		return new EmbedBuilder()
			.setTitle("예약된 메시지")
			.setDescription(message)
			.setFooter({ text: `보낸 사람: ${owner}` })
			.setColor("#00AAFF")
			.setTimestamp();
	}
}
