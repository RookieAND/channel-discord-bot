import { container } from "@sapphire/framework";
import mongoose from "mongoose";

export const connectMongoDatabase = async (uri: string) => {
	try {
		mongoose.set("debug", process.env.NODE_ENV === "development");
		await mongoose.connect(uri);
		container.logger.info("Successfully connected to MongoDB");
	} catch (error) {
		container.logger.error(error);
		process.exit(1);
	}
};
