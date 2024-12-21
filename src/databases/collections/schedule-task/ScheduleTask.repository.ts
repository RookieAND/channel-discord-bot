import type { Model } from "mongoose";

import { scheduleTaskModel, type ScheduleTask } from "./ScheduleTask.schema";

class ScheduleTaskRepository {
	private model: Model<ScheduleTask> = scheduleTaskModel;

	public async create(task: ScheduleTask) {
		return this.model.create(task);
	}

	public async getAvailableTasks() {
		const now = new Date();
		return this.model.find({ time: { $gte: now } });
	}
}

export const scheduleTaskRepository = new ScheduleTaskRepository();
