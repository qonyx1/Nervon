import { load as RegisterEvents } from "./RegisterEvents";
import { load as RegisterSlashCommands } from "./RegisterCommands";

export async function initializeModules(): Promise<void> {
	RegisterEvents().catch((err: Error) => console.error(err)).then(() => console.log("Successfully registered events."));
	RegisterSlashCommands().catch((err: Error) => console.error(err)).then(() => console.log("Successfully registered slash commands."));
}