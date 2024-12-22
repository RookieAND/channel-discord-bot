import { ScheduledTask } from "@sapphire/plugin-scheduled-tasks";
import type { TaskStore } from "#/schedules/structures/TaskStore";
import type { LocalStorage } from "#/storages/local-storage";
import { ScheduledTaskType } from "#/types/schedule-task.type";

declare module "discord.js" {
	interface Client {
		readonly dev: boolean;
		readonly localStorage: LocalStorage;
	}
}

declare module "@sapphire/plugin-scheduled-tasks" {
	interface ScheduledTasks {
		[ScheduledTaskType.RESERVATION_MESSAGE]: ScheduledTaskData[ScheduledTaskType.RESERVATION_MESSAGE];
		[ScheduledTaskType.SCHEDULE_MESSAGE]: ScheduledTaskData[ScheduledTaskType.SCHEDULE_MESSAGE];
	}
}

declare module "@sapphire/pieces" {
	interface Container {
		localStorage: LocalStorage;
	}

	interface StoreRegistryEntries {
		tasks: TaskStore;
	}
}

declare global {
	namespace NodeJS {
		interface ProcessEnv {
			MONGO_URI: string;
			BOT_TOKEN: string;
		}
	}
}
