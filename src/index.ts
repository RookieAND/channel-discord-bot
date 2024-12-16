import dotenv from "dotenv";
import { container } from "@sapphire/framework";

import { RookieDiscordClient } from "./RookieDiscordClient";

dotenv.config({ path: `.env.${process.env.NODE_ENV}` });

const client = new RookieDiscordClient();

async function bootstrap() {
	try {
		await client.login(process.env.BOT_TOKEN);
	} catch (error) {
		container.logger.error(error);
		await client.destroy();
		process.exit(1);
	}
}

void bootstrap();
