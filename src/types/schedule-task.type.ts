export enum ScheduledTaskType {
	SCHEDULE_MESSAGE = "scheduledMessage",
	RESERVATION_MESSAGE = "reservationMessage",
}
export interface ScheduledTaskData {
	[ScheduledTaskType.SCHEDULE_MESSAGE]: {
		channelList: string[];
		owner: string;
		title: string;
		content: string;
	};
	[ScheduledTaskType.RESERVATION_MESSAGE]: {
		channelList: string[];
		owner: string;
		title: string;
		content: string;
	};
}
