import { CronJob } from "cron";
import { TextBasedChannel } from "discord.js";
import { container } from "@sapphire/framework";

export class ScheduleEntry<
	TScheduledTaskType extends ScheduledTaskId = ScheduledTaskId,
	TScheduledTaskData extends
		ScheduledTaskData[TScheduledTaskType] = ScheduledTaskData[TScheduledTaskType],
> {
	public id: number;
	public taskId: string;
	public time: Date;
	private taskData: TScheduledTaskData;
	private running = false;
	private paused = false;

	constructor(
		id: number,
		taskId: string,
		time: Date,
		taskData: TScheduledTaskData,
	) {
		this.id = id;
		this.taskId = taskId;
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

		const taskPiece = container.stores.get("tasks").get(this.taskId);
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

export interface ScheduledTaskData {
	scheduledMessage: {
		channelList: string[];
		owner: string;
		message: string;
	};
}

export type ScheduledTaskId = keyof ScheduledTaskData;
