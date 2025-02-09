import fs from "fs";

export async function load_data(name: string) {
	try {
		const data = JSON.parse(fs.readFileSync(`./data/${name}.json`, 'utf8'));
		return data;
	} catch (err) {
		console.log(err);
		return {}; // return empty table if file doesnt exist
	}
}

export async function save_data(name: string, data: any) {
	try {
		fs.writeFileSync(`./data/${name}.json`, JSON.stringify(data, null, 2));
		return true;
	} catch (err) {
		console.log(err);
		return false;
	}
}

