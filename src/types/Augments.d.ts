import type { ScheduleRegistry } from "#/schedules/managers/ScheduleRegistry";
import type { TaskStore } from "#/schedules/structures/TaskStore";

declare module "discord.js" {
	interface Client {
		readonly dev: boolean;
		readonly schedule: ScheduleRegistry;
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

declare global {
	namespace NodeJS {
		interface ProcessEnv {
			MONGO_URI: string;
			BOT_TOKEN: string;
		}
	}
}
