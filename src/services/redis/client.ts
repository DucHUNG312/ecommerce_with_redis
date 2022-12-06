import { createClient, defineScript } from 'redis';
import { itemsKey, itemsByViewKey, itemsViewKey } from '$services/keys';
import { createIndexes } from './create-indexes';

const client = createClient({
	socket: {
		host: process.env.REDIS_HOST,
		port: parseInt(process.env.REDIS_PORT)
	},
	password: process.env.REDIS_PW,
	scripts: {
		unlock: defineScript({
			NUMBER_OF_KEYS: 1,
			SCRIPT: `
				if redis.call('GET', KEYS[1]) == ARGV[1] then
					return redis.call('DEL', KEYS[1])
				end
			`,
			transformArguments(key: string, token: string) {
				return [key, token];
			},
			transformReply(reply: any) {
				return reply;
			}
		}),
		incrementView: defineScript({
			NUMBER_OF_KEYS: 3,
			SCRIPT: `
				local itemsViewKey = KEYS[1]
				local itemsKey = KEYS[2]
				local itemsByViewKey = KEYS[3]

				local itemId = ARGV[1]
				local userId = ARGV[2]

				local inserted = redis.call('PFADD', itemsViewKey, userId)

				if inserted == 1 then
					redis.call('HINCRBY', itemsKey, 'views', 1)
					redis.call('ZINCRBY', itemsByViewKey, 1, itemId)
				end
			`,
			transformArguments(itemId: string, userId: string) {
				return [
					itemsViewKey(itemId), // items:views#abcd
					itemsKey(itemId), // items#abcd
					itemsByViewKey(), // items:view
					itemId, // abcd
					userId // 1234
				];
				// EVALSHA <ID> 3 items:views#abcd items#abcd items:view abcd 1234
			},
			transformReply() {}
		})
	}
});

client.on('error', (err) => console.error(err));
client.connect();

client.on('connect', async () => {
	try {
		await createIndexes();
	} catch (error) {
		console.log(error);
	}
});

export { client };
