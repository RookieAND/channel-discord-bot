import { type Document, Schema, model } from "mongoose";

export interface ScheduleTask extends Document {
	id: string;
	time: Date;
	taskType: string;
	taskData: JSON;
}

export const scheduleTaskSchema = new Schema<ScheduleTask>(
	{
		taskType: { type: String, required: true },
		taskData: { type: JSON, required: true },
		id: { type: String, required: true },
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
