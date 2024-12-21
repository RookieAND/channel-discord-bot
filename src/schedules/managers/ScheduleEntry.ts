import { CronJob } from "cron";
import { TextBasedChannel } from "discord.js";
import { container } from "@sapphire/framework";

export class ScheduleEntry<
	TScheduledTaskType extends ScheduledTaskType = ScheduledTaskType,
	TScheduledTaskData extends
		ScheduledTaskData[TScheduledTaskType] = ScheduledTaskData[TScheduledTaskType],
> {
	public id: number;
	public time: Date;
	public taskType: TScheduledTaskType;
	private taskData: TScheduledTaskData;
	private running = false;
	private paused = false;

	constructor({
		id,
		time,
		taskType,
		taskData,
	}: {
		id: number;
		time: Date;
		taskType: TScheduledTaskType;
		taskData: TScheduledTaskData;
	}) {
		this.id = id;
		this.taskType = taskType;
		this.time = time;
		this.taskData = taskData;
	}

	public isRunning() {
		return this.running;
	}

	public isPaused() {
		return this.paused;
	}

	public async run() {
		if (this.paused || this.running) return;
		this.running = true;

		const taskPiece = container.stores.get("tasks").get(this.taskType);
		await taskPiece?.run(this.taskData);

		this.running = false;
	}

	public pause() {
		this.paused = true;
	}

	public resume() {
		this.paused = false;
	}
}

export enum ScheduleTaskType {
	SCHEDULE_MESSAGE = "scheduledMessage",
	RESERVATION_MESSAGE = "reservationMessage",
}

export interface ScheduledTaskData {
	[ScheduleTaskType.SCHEDULE_MESSAGE]: {
		channelList: string[];
		owner: string;
		message: string;
	};
	[ScheduleTaskType.RESERVATION_MESSAGE]: {
		channel: string;
		owner: string;
		message: string;
	};
}

export type ScheduledTaskType = keyof ScheduledTaskData;
