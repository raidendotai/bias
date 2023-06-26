const axios = require(`axios`);

const PINECONE_KEY = `YOUR_KEY`
const PINECONDE_INDEX = `YOUR_INDEX`

async function postRequest(query) {
	const response = await axios.post(
		query.url,
		query.body, {
			headers: query.headers
		}
	)
	return response.data
}

async function upsert(query) {
	try {
		// {user,project,id,embedding,metadata}
		const namespace = `${query.user}-BIAS-${query.project}`;;

		const response = await postRequest({
			url: PINECONDE_INDEX + `/vectors/upsert`,
			headers: {
				"Api-Key": PINECONE_KEY,
				accept: `application/json`,
				"content-type": `application/json`,
			},
			body: {
				namespace,
				vectors: [{
					id: query.id,
					values: query.embedding,
					metadata: query.metadata,
				}, ],
			},
		});

		if (!response.upsertedCount) return {
			status: false,
			response
		};

		console.dir({
			pinecone: response,
			index: PINECONDE_INDEX,
			namespace: namespace,
			id: query.id,
		})

		return {
			status: true,
			index: PINECONDE_INDEX,
			namespace: namespace,
			id: query.id,
		};
	} catch (e) {
		console.log(e);
		return {
			status: false,
			error: `${e}`
		};
	}
}

async function query(query) {
	try {
		// {user,project,embedding,topK,filter}
		const namespace = `${query.user}-BIAS-${query.project}`;;
		let body = {
			namespace,
			includeMetadata: true,
			topK: query.topK,
			vector: query.embedding,
		};
		if (query.filter) body.filter = query.filter;

		const response = await postRequest({
			url: PINECONDE_INDEX + `/query`,
			headers: {
				"Api-Key": PINECONE_KEY,
				accept: `application/json`,
				"content-type": `application/json`,
			},
			body: body,
		});

		return {
			status: true,
			index: PINECONDE_INDEX,
			...response,
		};
	} catch (e) {
		console.log(e);
		return {
			status: false,
			error: `${e}`
		};
	}
}


async function update(query) {
	try {
		// {user,project,id,metadata}
		const namespace = `${query.user}-BIAS-${query.project}`;;
		let body = {
			id: query.id,
			namespace,
			setMetadata: query.metadata,
		};

		const response = await postRequest({
			url: PINECONDE_INDEX + `/vectors/update`,
			headers: {
				"Api-Key": PINECONE_KEY,
				accept: `application/json`,
				"content-type": `application/json`,
			},
			body: body,
		});
		
		return {
			status: true,
			index: PINECONDE_INDEX,
			...response,
		};
	} catch (e) {
		console.log(e);
		return {
			status: false,
			error: `${e}`
		};
	}
}

async function del(query) {
	try {
		// {user,project,id}
		const namespace = `${query.user}-BIAS-${query.project}`;;
		let body = {
			ids: [query.id],
			namespace,
			deleteAll: false,
		};
		console.dir({
			pineconeDebug_query: query,
			body
		}, {
			depth: 5
		});
		const response = await postRequest({
			url: PINECONDE_INDEX + `/vectors/delete`,
			headers: {
				"Api-Key": PINECONE_KEY,
				accept: `application/json`,
				"content-type": `application/json`,
			},
			body: body,
		});
		console.dir({
			pineconeDebug_response: response
		});
		return {
			status: true,
			index: PINECONDE_INDEX,
			...response,
		};
	} catch (e) {
		console.log(e);
		return {
			status: false,
			error: `${e}`
		};
	}
}

module.exports = {
	upsert,
	query,
	update,
	del,
}
