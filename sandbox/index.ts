import 'dotenv/config';
import { client } from '../src/services/redis';

const run = async () => {
	await client.hSet('bus1', {
		color: 'red',
		year: 1950
	});

	await client.hSet('bus2', {
		color: 'blue',
		year: 1951
	});

	await client.hSet('bus3', {
		color: 'yellow',
		year: 1955
	});

	const results = await Promise.all([
		client.hGetAll('bus1'),
		client.hGetAll('bus2'),
		client.hGetAll('bus3')
	]);

	console.log(results);
};
run();
