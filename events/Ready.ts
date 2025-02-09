import { Events } from "discord.js";

export default {
	name: Events.ClientReady,
	once: false,
	execute() {
		console.log("Bot is ready!");
	}
}