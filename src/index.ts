import { container } from "@sapphire/framework";
import dotenv from "dotenv";

import "#/setups";
import { connectMongoDatabase } from "#/databases/connect-database";

import { RookieDiscordClient } from "./RookieDiscordClient";

dotenv.config({ path: `.env.${process.env.NODE_ENV}` });

const client = new RookieDiscordClient();

async function bootstrap() {
	try {
		await connectMongoDatabase(process.env.MONGO_URI);
		await client.login(process.env.BOT_TOKEN);
	} catch (error) {
		container.logger.error(error);
		await client.destroy();
		process.exit(1);
	}
}

void bootstrap();
