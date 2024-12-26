import { ApplyOptions } from "@sapphire/decorators";
import { isTextChannel } from "@sapphire/discord.js-utilities";
import { ScheduledTask } from "@sapphire/plugin-scheduled-tasks";
import { Status } from "discord.js";
import {
	type ScheduledTaskData,
	ScheduledTaskType,
} from "#/types/schedule-task.type";

@ApplyOptions<ScheduledTask.Options>({
	name: ScheduledTaskType.RESERVATION_MESSAGE,
})
export class ReservationScheduledTask extends ScheduledTask {
	public async run(
		payload: ScheduledTaskData[ScheduledTaskType.RESERVATION_MESSAGE],
	) {
		if (this.container.client.ws.status !== Status.Ready) {
			return;
		}

		const { channelList, title, content, mentionRoleList } = payload;

		const sendChannelList = this.container.client.channels.cache.filter(
			(channel) => channelList.includes(channel.id),
		);

		for (const channel of sendChannelList.values()) {
			if (!isTextChannel(channel)) return;
			try {
				const messagePayload = this.createMessageContent(
					title,
					content,
					mentionRoleList,
				);
				await channel.send(messagePayload);
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : error;
				this.container.logger.error(
					`Failed to send message to channel ${channel.id}: ${errorMessage}`,
				);
			}
		}
	}

	private createMessageContent(
		title: string,
		content: string,
		mentionRoles: string[],
	) {
		const stringifiedMentionRoles = mentionRoles.map((role) => `<@${role}>`);
		const messagePayload = {
			content: `${title}\n${content}\n${stringifiedMentionRoles}`,
		};
		return messagePayload;
	}
}
