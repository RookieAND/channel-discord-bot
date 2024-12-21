import {
	type ScheduledTaskData,
	type ScheduledTaskType,
	ScheduleEntry,
} from "./ScheduleEntry";

export class ScheduleRegistry {
	public entries: Map<number, ScheduleEntry>;
	private interval: NodeJS.Timeout | null = null;

	public constructor() {
		this.entries = new Map();
	}

	public getTask(id: number) {
		return this.entries.get(id);
	}

	public addTask<
		TScheduleTaskType extends ScheduledTaskType,
		TScheduledTaskData extends ScheduledTaskData[TScheduleTaskType],
	>(
		id: number,
		time: Date,
		taskType: TScheduleTaskType,
		taskData: TScheduledTaskData,
	) {
		if (this.entries.has(id)) {
			throw new Error(`Task with ID "${id}" already exists.`);
		}

		const entry = new ScheduleEntry({ id, time, taskType, taskData });
		this.entries.set(id, entry);
		this._checkInterval();
	}

	public removeTask(id: number) {
		const entry = this.entries.get(id);
		if (!entry) throw new Error(`Task with ID "${id}" does not exist.`);

		entry.pause();
		this.entries.delete(id);
		this._checkInterval();
	}

	public pauseTask(id: number) {
		const entry = this.entries.get(id);
		if (!entry) throw new Error(`Task with ID "${id}" does not exist.`);

		entry.pause();
	}

	public resumeTask(id: number): void {
		const entry = this.entries.get(id);
		if (!entry) throw new Error(`Task with ID "${id}" does not exist.`);

		entry.resume();
	}

	private async _execute() {
		const now = new Date();
		for (const entry of this.entries.values()) {
			if (entry.time <= now && !entry.isPaused && !entry.isRunning) {
				await entry.run();
			}
		}
	}

	private _checkInterval() {
		if (this.entries.size > 0 && !this.interval) {
			this.interval = setInterval(() => this._execute(), 5000);
			return;
		}
		if (this.entries.size === 0 && this.interval) {
			clearInterval(this.interval);
			this.interval = null;
		}
	}
}
