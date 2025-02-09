
import { AuditLogEvent, ChannelType, Guild, GuildAuditLogsEntry, Role, TextChannel, ThreadChannel, User, VoiceChannel, type AnyThreadChannel, type APIAuditLogEntry, type AuditLogChange, type Snowflake } from "discord.js";
import { createEmbed, startWorker } from "./HelperFunctions";
import { load_data, save_data } from "./Data";
import { client } from "../index";
export const actions = {
	[AuditLogEvent.MemberBanAdd]: "User Banned",
	[AuditLogEvent.MemberKick]: "User Kicked",
	[AuditLogEvent.MemberBanRemove]: "User Unbanned",
	[AuditLogEvent.MessageDelete]: "Message Deleted",
	[AuditLogEvent.ChannelCreate]: "Channel Created",
	[AuditLogEvent.ChannelDelete]: "Channel Deleted",
	[AuditLogEvent.ChannelUpdate]: "Channel Updated",
	[AuditLogEvent.RoleCreate]: "Role Created",
	[AuditLogEvent.RoleDelete]: "Role Deleted",
	[AuditLogEvent.RoleUpdate]: "Role Updated",
	[AuditLogEvent.GuildUpdate]: "Server Updated",
};

export const blacklistEvents = [
	AuditLogEvent.ChannelCreate,
	AuditLogEvent.GuildUpdate,
	AuditLogEvent.ChannelDelete,
	AuditLogEvent.MessageDelete,

]

export async function ensureLogThread(channel: TextChannel): Promise<AnyThreadChannel> {
	const threadName = "Discord Event Logs";
	if (!channel.isTextBased()) {
		console.log("log channel not text?");
	}
	const threads = await channel.threads.fetch();

	let thread = threads.threads.find((c: ThreadChannel) => c.name === threadName);
	if (!thread) {
		thread = await channel.threads.create(
			{
				name: threadName,
				type: ChannelType.PublicThread,
				autoArchiveDuration: 1440
			}
		);
	}
	return thread;
}

export function beautifyTarget(target: User | TextChannel | VoiceChannel | Role | Guild | AnyThreadChannel | null): string {
	if (target instanceof User) {
		return `User: ${target.tag} (${target.id})`;
	} else if (target instanceof TextChannel || target instanceof VoiceChannel) {
		return `Channel: ${target.name} (${target.id})`;
	} else if (target instanceof Role) {
		return `Role: ${target.name} (${target.id})`;
	} else if (target instanceof Guild) {
		return `Server: ${target.name} (${target.id})`;
	} else if (target instanceof ThreadChannel) {
		return `Thread: ${target.name} (${target.id})`;
	} else if (target === null) {
		return `Target not found.`;
	} else {
		return `${target}`;
	}
}
export function beautifyChanges(entry: AuditLogChange[]): string {
	if (!entry) {
		return "No changes were made.";
	};
	let changeList = [];
	for (let change of entry ?? []) {
		let before = change.new ?? "None";
		let after = change.old ?? "None";
		changeList.push(`**${change.key}**: ${after} -> ${before}`);
	}
	return changeList.join("\n");
}

export async function formatAuditLogEntry(entry: GuildAuditLogsEntry): Promise<string> {
	const action = actions[entry.action as keyof typeof actions];
	let desc = `**Action**: ${action}\n`;
	if (entry.target) {
		desc += `**Target**: ${beautifyTarget(entry.target as unknown as any)}\n`;
	}
	if (entry.reason) {
		desc += `**Reason**: ${entry.reason}\n`;
	}
	if (entry.changes) {
		desc += `**Changes**:\n${beautifyChanges(entry.changes)}\n`;
	}
	return desc;
}

export async function serverLog(entry: GuildAuditLogsEntry, channel: TextChannel): Promise<void> {
	try {
		const thread = await ensureLogThread(channel);
		const guild = channel.guild;
		const description = await formatAuditLogEntry(entry);
		await thread.send(
			{
				embeds: [
					createEmbed("Audit Log Event", description)
				]
			}
		);
		await handleCounters(entry, guild);
	} catch (err) {
		console.log(err)
	}
}

async function handleCounters(entry: GuildAuditLogsEntry, guild: Guild): Promise<void> {
	const data = await load_data("data");
	const serverid = guild.id;
	if (!(serverid in data)) {
		data[serverid] = {};
	};
	let counters: { [key: string]: any } = data[serverid]["counters"];
	if (!("counters" in data[serverid])) {
		counters = data[serverid]["counters"] = {};
	};
	if (!counters) {
		return;
	}
	if (entry.action in blacklistEvents) {
		const userid = entry.executor?.id ?? "";
		if (!(userid in counters)) {
			counters[userid] = {
				"events": [],
				"timestamp": Date.now()
			};
		}
		const currentTime = Date.now();
		counters[userid]["events"] = counters[userid]["events"].filter((event: any) => currentTime - event["timestamp"] < 600);

		counters[userid]["events"].push(currentTime);
		console.log(`User ${userid} has ${counters[userid]["events"].length} events in the last 10 minutes.`);

		if (counters[userid]["events"].length >= 10) {
			console.log(`User ${userid} has exceeded the threshold. Taking action...`);
			const logChannel = await client.channels.fetch(data[serverid]["channels"]["log_channel"]) as TextChannel;
			await handleBlacklistedUsers(entry, logChannel, guild);
			counters[userid]["events"] = [];
		}
		await save_data("data", data);
	}
}

async function handleBlacklistedUsers(entry: GuildAuditLogsEntry, channel: TextChannel, guild: Guild) {
	const user = await client.users.fetch(entry.executorId!);

	console.log(`Handling blackisted user ${user.tag} in server ${guild.name}`);

	const member = await guild.members.fetch(user.id);
	try {
		await member.timeout(1440 * 60 * 1000, "Automatic Nuke Protection");
		console.log(`Successfully timed out user ${user.tag}`);
	} catch (err) {
		console.log(err);
	}
	async function roles() {
		if (member) {
			await member.roles.remove(
				guild.roles.cache.filter((role) => role.name !== "@everyone")
			)
			console.log(`Successfully removed all roles from user ${user.tag}`);
		}
	}
	startWorker(roles);
	const embed = createEmbed(`🚨 Action Taken`, `The member ${user.tag} (${user.id}) has been quarantined from the server. Please review changes made from this member and decide on if the quarantine should be lifted.`)

	await channel.send({ content: "@everyone", embeds: [embed], allowedMentions: { parse: ["everyone"] } });

	try {
		const owner = guild.fetchOwner();
		if (!(await owner).createDM()) {
			(await owner).createDM();
		}
		(await owner).send({ embeds: [embed] });
		console.log(`Attempted to DM the owner: ${(await owner).user.username}`)
	} catch (err) {
		console.log(err);
	}
}