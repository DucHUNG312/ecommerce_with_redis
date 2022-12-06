import type { Session } from '$services/types';
import { sessionKey } from '$services/keys';
import { client } from '$services/redis';

export const getSession = async (id: string) => {
	const session = await client.hGetAll(sessionKey(id));

	// check if session is exist
	if (!Object.keys(session).length) {
		return null;
	}

	return deserialize(id, session);
};

export const saveSession = async (session: Session) => {
	return client.hSet(sessionKey(session.id), serialize(session));
};

const serialize = (session: Session) => {
	return {
		userId: session.userId,
		username: session.username
	};
};

const deserialize = (id: string, session: { [key: string]: string }) => {
	return {
		id: id,
		userId: session.userId,
		username: session.username
	};
};
