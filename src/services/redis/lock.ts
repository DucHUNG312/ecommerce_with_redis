import { randomBytes } from 'crypto';
import { client } from './client';

export const withLock = async (key: string, cb: (redisClient: Client, signal: any) => any) => {
	// Initiaize a few variables to control retry behavior
	const retryDelayMs = 50;
	const timeoutMs = 2000;
	let retries = 40;

	// Generate a random value to store at the lock key
	const token = randomBytes(6).toString('hex');
	// Create the lock key
	const lockKey = `lock:${key}`;

	// Set up a while loop to implement the retry behavior
	while (retries >= 0) {
		retries--;

		// Try to do a SET NX operation
		const acquired = await client.set(lockKey, token, {
			NX: true,
			// automatically delete in 2000ms
			PX: timeoutMs
		});

		// ELSE brief pause (retryDeplayMs) and then retry
		if (!acquired) {
			await pause(retryDelayMs);
			continue;
		}

		// IF the set is successful, then run the callback
		try {
			const signal = { expired: false };
			setTimeout(() => {
				signal.expired = true;
			}, timeoutMs);
			const proxiedClient = buildClientProxy(timeoutMs);

			// using proxy client and passing expired signal to make sure
			// we will not delet the key if it already expired
			const result = await cb(proxiedClient, signal);
			return result;
		} finally {
			// Unset the lock key using LUA script
			// We use LUA script to make sure we will not delete
			// the key if it already expired
			await client.unlock(lockKey, token);
		}
	}
};

type Client = typeof client;

const buildClientProxy = (timeOutMs: number) => {
	const startTime = Date.now();

	const handler = {
		get(target: Client, prop: keyof Client) {
			if (Date.now() >= startTime + timeOutMs) {
				throw new Error("Lock expired, can't write any more data");
			}

			const value = target[prop];
			return typeof value === 'function' ? value.bind(target) : value;
		}
	};

	return new Proxy(client, handler) as Client;
};

export const pause = (duration: number) => {
	return new Promise((resolve) => {
		setTimeout(resolve, duration);
	});
};
