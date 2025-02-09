import { Colors, EmbedBuilder } from 'discord.js';
import { Worker } from 'worker_threads';

export function startWorker(data: any) {
	return new Promise((resolve, reject) => {
		const worker = new Worker('./worker.js');

		worker.on('message', resolve);
		worker.on('error', reject);
		worker.on('exit', (code) => {
			if (code !== 0) {
				reject(new Error(`Worker stopped with exit code ${code}`));
			}
		});

		worker.postMessage(data);
	});
};
export function createEmbed(name: string, description: string, footer?: string): EmbedBuilder {
	const embed = new EmbedBuilder()
		.setTitle(name)
		.setDescription(description)
		.setColor(Colors.Red);
	if (footer) embed.setFooter({ text: footer });
	return embed
};
