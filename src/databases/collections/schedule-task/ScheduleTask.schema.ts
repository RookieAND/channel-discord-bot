import type { Cron } from "@sapphire/time-utilities";
import { type Document, Schema, model } from "mongoose";

import {
	type ScheduledTaskData,
	ScheduledTaskType,
} from "#/types/schedule-task.type";

export interface ScheduleTask extends Document {
	time: Date;
	cronExpression: Cron | null;
	taskType: ScheduledTaskType;
	taskData: ScheduledTaskData[ScheduledTaskType];
}

export const scheduleTaskSchema = new Schema<ScheduleTask>(
	{
		taskType: {
			type: String,
			required: true,
			enum: Object.values(ScheduledTaskType),
		},
		taskData: { type: Object, required: true },
		cronExpression: { type: String, default: null },
		time: { type: Date },
	},
	{
		collection: "schedule-tasks",
		timestamps: true,
	},
);

export const scheduleTaskModel = model<ScheduleTask>(
	"schedule-tasks",
	scheduleTaskSchema,
);
