import type { Cron } from "@sapphire/time-utilities";
import { type Document, Schema, model } from "mongoose";

import {
	type ScheduledTaskData,
	ScheduledTaskType,
} from "#/types/schedule-task.type";

export interface ScheduleTask<
	TaskType extends ScheduledTaskType = ScheduledTaskType,
	TaskData extends ScheduledTaskData[TaskType] = ScheduledTaskData[TaskType],
> extends Document {
	time: Date;
	cronExpression: Cron | null;
	taskType: TaskType;
	taskData: TaskData;
}

const collectionName = "schedule-tasks";

export const scheduleTaskSchema = new Schema<ScheduleTask>(
	{
		taskType: {
			type: String,
			required: true,
			enum: ScheduledTaskType,
		},
		taskData: { type: Object, required: true },
		cronExpression: { type: String, default: null },
		time: { type: Date },
	},
	{
		collection: collectionName,
		timestamps: true,
	},
);

export const scheduleTaskModel = model<ScheduleTask>(
	collectionName,
	scheduleTaskSchema,
);
