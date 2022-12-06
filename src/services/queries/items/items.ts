import type { CreateItemAttrs } from '$services/types';
import { client } from '$services/redis';
import { serialize } from './serialize';
import { deserialize } from './deserialize';
import { genId } from '$services/utils';
import { itemsKey, itemsByViewKey, itemsByEndingAtKey, itemsByPriceKey } from '$services/keys';

export const getItem = async (id: string) => {
	const item = await client.hGetAll(itemsKey(id));

	if (!Object.keys(item).length) {
		return null;
	}

	return deserialize(id, item);
};

export const getItems = async (ids: string[]) => {
	// implement pipeline
	const commands = ids.map((id) => {
		return client.hGetAll(itemsKey(id));
	});
	const results = await Promise.all(commands);

	return results.map((result, idx) => {
		if (!Object.keys(result).length) {
			return null;
		}
		return deserialize(ids[idx], result);
	});
};

export const createItem = async (attrs: CreateItemAttrs, userId: string) => {
	const id = genId();

	const serialized = serialize(attrs);

	// use pipeline, we can send one single request to redis
	await Promise.all([
		// create item hash, store information about item
		client.hSet(itemsKey(id), serialized),
		// create item view sorted set
		client.zAdd(itemsByViewKey(), {
			value: id,
			score: 0
		}),
		// create item ending at sorted set
		client.zAdd(itemsByEndingAtKey(), {
			value: id,
			score: attrs.endingAt.toMillis()
		}),
		// create item price sorted set
		client.zAdd(itemsByPriceKey(), {
			value: id,
			score: 0
		})
	]);

	return id;
};
