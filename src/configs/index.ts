import { LogLevel } from "@sapphire/framework";
import {
	ActivityType,
	GatewayIntentBits,
	Options,
	type ClientOptions,
} from "discord.js";

export const CLIENT_OPTIONS: ClientOptions = {
	allowedMentions: { users: [], roles: [] },
	caseInsensitiveCommands: true,
	caseInsensitivePrefixes: true,
	intents: [
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildEmojisAndStickers,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMessageReactions,
	],
	loadMessageCommandListeners: true,
	makeCache: Options.cacheEverything(),
	sweepers: {
		...Options.DefaultSweeperSettings,
		messages: {
			interval: 60 * 3,
			lifetime: 60 * 15,
		},
	},
	presence: {
		activities: [
			{
				name: "KDT Goorm Discord Bot",
				type: ActivityType.Playing,
			},
		],
	},
	logger: {
		level:
			process.env.NODE_ENV === "development" ? LogLevel.Debug : LogLevel.Info,
	},
};
