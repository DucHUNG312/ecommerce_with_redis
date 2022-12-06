import { client } from '../redis';
import { pageCacheKey } from '../keys';

const cacheRoutes = ['/about', '/privacy', '/auth/signin', '/auth/signup'];

export const getCachedPage = (route: string) => {
	if (cacheRoutes.includes(route)) {
		return client.get(pageCacheKey(route));
	}

	return null;
};

export const setCachedPage = (route: string, page: string) => {
	if (cacheRoutes.includes(route)) {
		return client.set(pageCacheKey(route), page, {
			// Expire this value for 2 seconds
			EX: 2
		});
	}

	return null;
};
