import { client } from '$services/redis';
import { userLikesKey, itemsKey } from '$services/keys';
import { getItems } from './items';

export const userLikesItem = async (itemId: string, userId: string) => {
	return client.sIsMember(userLikesKey(userId), itemId);
};

export const likedItems = async (userId: string) => {
	// fetch all the item id from this user's liked set
	const ids = await client.sMembers(userLikesKey(userId));

	// fecth all the item hashes with those ids and return as array
	return getItems(ids);
};

export const likeItem = async (itemId: string, userId: string) => {
	// add the item that user liked in a set
	const inserted = await client.sAdd(userLikesKey(userId), itemId);

	// sAdd can return either 0 or 1, so we asigned the result to handle
	// the case that 2 incoming requests come from same user at a same time
	if (inserted) {
		// increase like number of the item
		return client.hIncrBy(itemsKey(itemId), 'likes', 1);
	}
};

export const unlikeItem = async (itemId: string, userId: string) => {
	const removed = await client.sRem(userLikesKey(userId), itemId);

	if (removed) {
		// decrease like number of the item
		return client.hIncrBy(itemsKey(itemId), 'likes', -1);
	}
};

export const commonLikedItems = async (userOneId: string, userTwoId: string) => {
	const ids = await client.sInter([userLikesKey(userOneId), userLikesKey(userTwoId)]);

	return getItems(ids);
};
