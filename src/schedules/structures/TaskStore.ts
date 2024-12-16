import { Store } from "@sapphire/framework";

import { Task } from "#/schedules/structures/Task";

export class TaskStore extends Store<Task, "tasks"> {
	public constructor() {
		super(Task, { name: "tasks" });
	}
}
