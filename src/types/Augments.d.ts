import type { ScheduleManager } from "#/schedules/managers/ScheduleManager";
import type { TaskStore } from "#/schedules/structures/TaskStore";

declare module "discord.js" {
	interface Client {
		readonly dev: boolean;
		readonly schedule: ScheduleManager;
	}
}

declare module "@sapphire/pieces" {
	interface Container {
		schedule: ScheduleManager;
	}

	interface StoreRegistryEntries {
		tasks: TaskStore;
	}
}
