import type { Model, ProjectionType } from "mongoose";

import dayjs from "#/utils/dayjs";

import { type ScheduleTask, scheduleTaskModel } from "./schedule-task.schema";
import type { ScheduledTaskType } from "#/types/schedule-task.type";

class ScheduleTaskRepository {
	private model: Model<ScheduleTask> = scheduleTaskModel;

	public async create(task: Partial<ScheduleTask>) {
		return this.model.create(task);
	}

	public async findAvailableTask() {
		const now = dayjs().toDate();
		return this.model.find({ time: { $gte: now } });
	}

	public async removeById(id: string) {
		return this.model.deleteOne({ id });
	}

	public async findById(
		id: string,
		projection: ProjectionType<ScheduleTask> = {},
	) {
		return this.model.findOne({ id }, projection);
	}

	public async findAvailableTaskByType(type: ScheduledTaskType) {
		const now = dayjs().toDate();
		return this.model.find({ type, time: { $gte: now } });
	}
}

export const scheduleTaskRepository = new ScheduleTaskRepository();
