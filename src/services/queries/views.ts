import { client } from '$services/redis';
// import { itemsKey, itemsByViewKey, itemsViewKey } from '$services/keys';

export const incrementView = async (itemId: string, userId: string) => {
	// // check if userId already exist in HyperLogLog itemsViewKey
	// const inserted = await client.pfAdd(itemsViewKey(itemId), userId);

	// if (inserted) {
	// 	return Promise.all([
	// 		// increase view in item hash
	// 		client.hIncrBy(itemsKey(itemId), 'views', 1),
	// 		// increase view in item view sorted set
	// 		client.zIncrBy(itemsByViewKey(), 1, itemId)
	// 	]);
	// }

	// Using LUA script
	return client.incrementView(itemId, userId);
};

// Keys need to access
// 1. itemsViewKey
// 2. itemsKey
// 3. itemsByViewKey

// Arguments I need to accept
// 1. itemId
// 2. userId
