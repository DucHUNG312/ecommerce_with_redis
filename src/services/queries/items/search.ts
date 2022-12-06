import { client } from '$services/redis';
import { deserialize } from './deserialize';
import { itemsIndexKey } from '$services/keys';

export const searchItems = async (term: string, size: number = 5) => {
	// format the term that user input
	const cleaned = term
		.replaceAll(/[^a-zA-Z0-9 ]/g, '')
		.trim()
		.split(' ')
		.map((word) => (word ? `%%${word}%%` : ''))
		.join(' ');

	// Look at cleaned and make sure it is valid
	if (cleaned === '') {
		return [];
	}

	// the term appeard in the name is more weight than it appeard in the description
	const query = `(@name:(${cleaned}) => { $weight: 5.0 }) | (@description:(${cleaned}))`;

	// Use a client to do an actual search
	const result = await client.ft.search(itemsIndexKey(), query, {
		LIMIT: {
			from: 0,
			size: size
		}
	});

	// Deserialize and return the search results
	return result.documents.map(({ id, value }) => deserialize(id, value as any));
};
