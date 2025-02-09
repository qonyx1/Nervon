import { Client, GatewayIntentBits, Partials } from "discord.js";
import { initializeModules } from "./modules/InitializeModules";

export const client = new Client({
	intents: [
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.Guilds,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildModeration
	],
	partials: [
		Partials.Message,
		Partials.Reaction,
		Partials.GuildMember,
		Partials.Channel
	]
});
async function start() {
	await initializeModules();
	await client.login(process.env.TOKEN).catch((err) => {
		console.log('error starting client');
		console.log(err);
	}).then((c) => {
		console.log(`Logged in as ${client.user?.tag}`);
		console.log('client started');
	});
}

await start();

process.on('unhandledRejection', (err: Error) => console.error(err));
process.on('uncaughtException', (err: Error) => console.error(err));
client.on("error", (err: Error) => console.error(err));
