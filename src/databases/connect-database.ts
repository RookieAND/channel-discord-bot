import mongoose from "mongoose";
import { container } from "@sapphire/framework";

export const connectMongoDatabase = async (uri: string) => {
	try {
		await mongoose.connect(uri);
		container.logger.info("Successfully connected to MongoDB");
	} catch (error) {
		container.logger.error(error);
		process.exit(1);
	}
};
