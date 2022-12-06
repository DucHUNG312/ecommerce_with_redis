import type { CreateUserAttrs } from '$services/types';
import { genId } from '$services/utils';
import { client } from '$services/redis';
import { usersKey, usernamesUniqueKey, usernamesKey } from '$services/keys';

export const getUserByUsername = async (username: string) => {
	// use the username argument to look up the persons userId with the username sorted set
	const decimalId = await client.zScore(usernamesKey(), username);

	// make sure we actually got an id from the lookup
	if (!decimalId) {
		throw new Error('User does not exist!');
	}

	// take the id and convert it back to hex
	const id = decimalId.toString(16);

	// use the id to look up the user's hash
	const user = await client.hGetAll(usersKey(id));

	// deserialize and return the hash
	return deserialize(id, user);
};

export const getUserById = async (id: string) => {
	const user = await client.hGetAll(usersKey(id));

	return deserialize(id, user);
};

export const createUser = async (attrs: CreateUserAttrs) => {
	const id = genId();

	// check if username is already in the set of usernames
	const exists = await client.sIsMember(usernamesUniqueKey(), attrs.username);
	if (exists) {
		throw new Error('User name is already taken!');
	}

	// create user hash
	await client.hSet(usersKey(id), serialize(attrs));

	// add username to the username set
	await client.sAdd(usernamesUniqueKey(), attrs.username);

	// add username and userId in username set
	await client.zAdd(usernamesKey(), {
		value: attrs.username,
		// covert id to base 10 from base 16
		score: parseInt(id, 16)
	});

	return id;
};

// serialize information
const serialize = (user: CreateUserAttrs) => {
	return {
		username: user.username,
		password: user.password
	};
};

// deserialize information
// { [key: string]: string } is type of an object has the key is string and value is string
const deserialize = (id: string, user: { [key: string]: string }) => {
	return {
		id: id,
		username: user.username,
		password: user.password
	};
};
