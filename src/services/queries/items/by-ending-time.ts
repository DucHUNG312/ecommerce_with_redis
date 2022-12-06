import { client } from '$services/redis';
import { itemsByEndingAtKey, itemsKey } from '$services/keys';
import { deserialize } from './deserialize';

export const itemsByEndingTime = async (order: 'DESC' | 'ASC' = 'DESC', offset = 0, count = 10) => {
	const ids = await client.zRange(itemsByEndingAtKey(), Date.now(), '+inf', {
		BY: 'SCORE',
		LIMIT: {
			offset: offset,
			count: count
		}
	});

	const results = await Promise.all(ids.map((id) => client.hGetAll(itemsKey(id))));

	return results.map((item, idx) => deserialize(ids[idx], item));

	// Using sort command
	// let results: any = await client.sort(itemsByEndingAtKey(), {
	// 	GET: [
	// 		'#',
	// 		`${itemsKey('*')}->name`,
	// 		`${itemsKey('*')}->views`,
	// 		`${itemsKey('*')}->endingAt`,
	// 		`${itemsKey('*')}->imageUrl`,
	// 		`${itemsKey('*')}->price`
	// 	],
	// 	BY: 'nosort',
	// 	DIRECTION: order,
	// 	LIMIT: {
	// 		offset,
	// 		count
	// 	}
	// });

	// // parsing properties
	// const items = [];
	// while (results.length) {
	// 	const [id, name, views, endingAt, imageUrl, price, ...rest] = results;
	// 	if (endingAt < Date.now()) {
	// 		results = rest;
	// 	} else {
	// 		const item = deserialize(id, { name, views, endingAt, imageUrl, price });
	// 		items.push(item);
	// 		results = rest;
	// 	}
	// }

	// return items;
};
