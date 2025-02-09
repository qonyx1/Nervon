import { Collection, ContextMenuCommandBuilder, REST, Routes, SlashCommandBuilder } from "discord.js";
import { client } from "../index";
import dotENV from "dotenv";
import fs from "fs";
import path from "path";
dotENV.config();

declare module "discord.js" {
	export interface Client {
		slashcommands: Collection<string, SlashCommandBuilder>;
		commandsArray: [],
	}
}

export async function load() {
	client.slashcommands = new Collection();
	client.commandsArray = [];

	//SLASH COMMANDS
	const commandPath = path.join(__dirname, "..", "commands", "slash");
	const commandFolders = fs.readdirSync(commandPath);
	for (const folder of commandFolders) {
		const commandFiles = fs.readdirSync(`${commandPath}/${folder}`).filter(file => file.endsWith(".ts"));

		for (const file of commandFiles) {
			//Log.debug(`[Get] | Slash Command | ${file}`);
			const command = (await import(`${commandPath}/${folder}/${file}`)).default;

			client.slashcommands.set(command.data.name, command);
			client.commandsArray.push(command.data.toJSON() as never);

			//Log.debug(`[Loaded]  | Slash Command | ${file}`);


		}
	}

	let clientId = process.env.CLIENT_ID || "1322087149750976553";

	const rest = new REST({ version: '10' }).setToken(process.env.TOKEN!);

	(async () => {
		try {
			console.log("Registering all context & (/) commands.");

			await rest.put(
				Routes.applicationCommands(clientId),
				{ body: client.commandsArray });

			console.log("Registered all context & (/) commands");
		} catch (error) {
			console.error(error);
		}
	})();

	client.on("interactionCreate", async interaction => {
		if (interaction.isChatInputCommand()) {
			const command = client.slashcommands.get(interaction.commandName);
			if (!interaction.inCachedGuild()) {
				await interaction.reply({ content: "This command is only available in a server", ephemeral: true });
				return;
			}


			if (!command) return;

			try {
				await (command as any).execute(interaction);
			} catch (error) {
				console.error(error);
				await interaction
					.reply({ content: 'There was an error while executing this command!', ephemeral: true })
					.catch((err: Error) => console.log(err));
			}
		}
	});
}