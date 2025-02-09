import { Events, GuildAuditLogsEntry, User, Guild, type Channel, TextChannel, ChannelType } from 'discord.js';
import { serverLog } from '../Utility/GenUtils';
import { client } from '..';

export default {
	name: Events.GuildAuditLogEntryCreate,
	once: false,
	async execute(entry: GuildAuditLogsEntry, guild: Guild) {
		console.log(entry.actionType)
		if (entry.executorId === guild.members.me!.id) return;
		const user = await client.users.fetch(entry.executorId!);
		try {
			console.log(`Processing audit log entry ${entry.action} by ${user.username}`);

			const channels = await guild.channels.fetch();
			const textChannel = channels.find((c): c is TextChannel => c?.type === ChannelType.GuildText && c?.name.toLowerCase() === "logs");
			if (!textChannel) {
				await guild.channels.create({ name: "logs", type: ChannelType.GuildText });
			}
			await serverLog(entry, textChannel as unknown as TextChannel);
		}
		catch (error) {
			console.error(error);
		};
	}
};