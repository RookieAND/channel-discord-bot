import {
	ApplicationCommandRegistries,
	SapphireClient,
	container,
} from "@sapphire/framework";

import { CLIENT_OPTIONS } from "#/configs";
import { LocalStorage } from "#/storages/local-storage";
export class RookieDiscordClient extends SapphireClient {
	public override dev = process.env.NODE_ENV === "development";
	public override localStorage: LocalStorage;

	public constructor() {
		super(CLIENT_OPTIONS);
		ApplicationCommandRegistries.setDefaultGuildIds(["1260871187941163030"]);

		this.localStorage = new LocalStorage();

		container.localStorage = this.localStorage;
	}

	public override async login(token?: string) {
		const response = await super.login(token);
		return response;
	}

	public override async destroy() {
		// this.schedule.destroy();
		return super.destroy();
	}
}
