import { container, Piece } from "@sapphire/framework";
import type { Awaitable } from "@sapphire/utilities";
import type { CronJobParams } from "cron";

export type TaskOption = Piece.Options &
	Omit<
		CronJobParams<null, Task>,
		"onTick" | "onComplete" | "start" | "context"
	>;

export type TaskLoaderContext = Piece.LoaderContext<"tasks">;

export abstract class Task<
	Options extends TaskOption = TaskOption,
> extends Piece<Options, "tasks"> {
	public constructor(context: TaskLoaderContext, options: Options) {
		super(context, options);
		container.stores.get("tasks").set(this.name, this);
	}

	public abstract run(data: unknown): Awaitable<unknown>;
}
