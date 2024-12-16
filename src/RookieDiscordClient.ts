import { Enumerable } from "@sapphire/decorators";
import { SapphireClient, container } from "@sapphire/framework";

import { CLIENT_OPTIONS } from "#/configs";
import { ScheduleManager } from "#/schedules/managers/ScheduleManager";
import { TaskStore } from "#/schedules/structures/TaskStore";

export class RookieDiscordClient extends SapphireClient {
	public override dev = process.env.NODE_ENV === "development";
	public override schedule: ScheduleManager;

	public constructor() {
		super(CLIENT_OPTIONS);

		container.stores.register(new TaskStore());

		this.schedule = new ScheduleManager();
		container.schedule = this.schedule;
	}

	public override async login(token?: string) {
		const response = await super.login(token);
		this.schedule.init();
		return response;
	}

	public override async destroy() {
		// this.schedule.destroy();
		return super.destroy();
	}
}
