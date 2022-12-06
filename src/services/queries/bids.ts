import type { CreateBidAttrs, Bid } from '$services/types';
import { bidHistoryKey, itemsKey, itemsByPriceKey } from '$services/keys';
import { client, withLock } from '$services/redis';
import { DateTime } from 'luxon';
import { getItem } from './items';
import { pause } from '$services/redis';

export const createBid = async (attrs: CreateBidAttrs) => {
	// // Using watch in our app may not the best way to handle concurrency
	// // because it may has 2 bid at the same time, but the lower bid is processed first, then the
	// // higher one will be canceled => That's not what we want in this bidding application

	// // create new connection to use transaction
	// return client.executeIsolated(async (isolatedClient) => {
	// 	// watch the item hash
	// 	await isolatedClient.watch(itemsKey(attrs.itemId));

	// 	const item = await getItem(attrs.itemId);

	// 	if (!item) {
	// 		throw new Error('Item does not exist');
	// 	}
	// 	if (item.price >= attrs.amount) {
	// 		throw new Error('Bid too low');
	// 	}
	// 	if (item.endingAt.diff(DateTime.now()).toMillis() < 0) {
	// 		throw new Error('Item closed to bidding');
	// 	}

	// 	const serialized = serializeHistory(attrs.amount, attrs.createdAt.toMillis());

	// 	return (
	// 		isolatedClient
	// 			// create multi commands to run sequantially
	// 			.multi()
	// 			// push serialized to the right end of the bid history list
	// 			.rPush(bidHistoryKey(attrs.itemId), serialized)
	// 			// update item hash
	// 			.hSet(itemsKey(item.id), {
	// 				bids: item.bids + 1,
	// 				price: attrs.amount,
	// 				highestBidUserId: attrs.userId
	// 			})
	// 			// update item price sorted set
	// 			.zAdd(itemsByPriceKey(), {
	// 				value: item.id,
	// 				score: attrs.amount
	// 			})
	// 			// if the item changed before transaction, exec() will return null
	// 			.exec()
	// 	);
	// });

	// Using lock
	return withLock(attrs.itemId, async (lockedClient: typeof client, signal: any) => {
		const item = await getItem(attrs.itemId);

		if (!item) {
			throw new Error('Item does not exist');
		}
		if (item.price >= attrs.amount) {
			throw new Error('Bid too low');
		}
		if (item.endingAt.diff(DateTime.now()).toMillis() < 0) {
			throw new Error('Item closed to bidding');
		}

		const serialized = serializeHistory(attrs.amount, attrs.createdAt.toMillis());

		if (signal.expired) {
			throw new Error("Lock expired, can't write any more data");
		}

		return Promise.all([
			// push serialized to the right end of the bid history list
			lockedClient.rPush(bidHistoryKey(attrs.itemId), serialized),
			// update item hash
			lockedClient.hSet(itemsKey(item.id), {
				bids: item.bids + 1,
				price: attrs.amount,
				highestBidUserId: attrs.userId
			}),
			// update item price sorted set
			lockedClient.zAdd(itemsByPriceKey(), {
				value: item.id,
				score: attrs.amount
			})
		]);
	});
};

export const getBidHistory = async (itemId: string, offset = 0, count = 10): Promise<Bid[]> => {
	const startIndex = -1 * offset - count;
	const endIndex = -1 - offset;

	// get the range of bid history want to display (last 10 bids)
	const range = await client.lRange(bidHistoryKey(itemId), startIndex, endIndex);

	return range.map((bid) => deserializeHistory(bid));
};

const serializeHistory = (amount: number, createdAt: number) => {
	return `${amount}:${createdAt}`;
};

const deserializeHistory = (stored: string) => {
	const [amount, createdAt] = stored.split(':');
	return {
		amount: parseFloat(amount),
		createdAt: DateTime.fromMillis(parseInt(createdAt))
	};
};
