import { SapphireClient } from "@sapphire/framework";

import { GatewayIntentBits } from "discord.js";
import "dotenv/config";

const client = new SapphireClient({
	intents: [
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
	],
	loadMessageCommandListeners: true,
});
 
async function main() {
	await client.login(process.env.BOT_TOKEN);
}

void main();
