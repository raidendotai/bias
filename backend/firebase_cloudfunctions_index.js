const admin = require("firebase-admin");
const {
	Storage
} = require('@google-cloud/storage');
const {
	onRequest,
	onCall
} = require("firebase-functions/v2/https");
const crypto = require(`crypto`);
const axios = require(`axios`);
const pinecone = require(`./pinecone.js`);

const CONFIG = {
	RAIDEN_AI_KEY: `RAIDEN_AI_KEY`,
	COHERE_KEY: `COHERE_KEY`,
	ZAPIER_WEBHOOK: `ZAP_WEBHOOK_URL`,
}
admin.initializeApp({
	credential: admin.credential.cert(require(`./GOOGLE_FIREBASE_SERVICE_ACCOUNT.json`)),
});
const serviceAccountCloudStorage = require(`./GOOGLE_CLOUDSTORAGE_SERVICE_ACCOUNT.json`);


const firestoreBIAS = admin.firestore();
const storage = new Storage({
	credentials: serviceAccountCloudStorage,
});
const bucket = storage.bucket(`BUCKET_NAME`);


// BIAS CORE FUNCTIONS ----------------------------------------------------------------------------

async function project_new(query) {
	// {user , statement}
	const project = `${crypto.randomUUID()}`
	// generate search query suggestions with LLM
	// see pipelines/suggest-search-queries for definition
	const search_queries = (
		await axios.post(
			`https://api.raiden.ai/actions/pipeline/run`, {
				pipelineId: `bias@raiden.ai#suggest-search-queries`,
				query: {
					statement: query.statement
				},
			}, {
				headers: {
					"Content-Type": `application/json`,
					key: CONFIG.RAIDEN_AI_KEY,
				}
			}
		)
	).data.data.search_queries
	// create project in userdata/{userEmail}/project/{project}
	// set the generated search query suggestions

	await firestoreBIAS.doc(`userdata/${query.user}/project/${project}`).set({
		timestamp: Date.now(),
		statement: query.statement,
		suggested_search: search_queries,
		sourcesIds: [],
	})
	console.dir({
		user: query.user,
		project,
		suggested_search: search_queries,
	})
	return {
		user: query.user,
		project,
		suggested_search: search_queries,
	}
}

async function analyze_source(query) {
	// query : { user , project , statement , sourceId }
	try {
		let analysis = (
			await axios.post(
				`https://api.raiden.ai/actions/pipeline/run`, {
					pipelineId: `bias@raiden.ai#analyze-source`,
					query: query,
				}, {
					headers: {
						"Content-Type": `application/json`,
						key: CONFIG.RAIDEN_AI_KEY,
					}
				}
			)
		).data.data

		if (analysis.args.length || analysis.counter_args.length) {
			try {
				if (analysis.args.length) {
					const classified_args = await cohere_classify({
						texts: analysis.args.map(e => e.text)
					})
					analysis.args = analysis.args.map((e, idx) => {
						return {
							...e,
							label: classified_args[idx],
						}
					})
				}
			} catch (e) {
				false
			}
			try {
				if (analysis.counter_args.length) {
					const classified_counter_args = await cohere_classify({
						texts: analysis.counter_args.map(e => e.text)
					})
					analysis.counter_args = analysis.counter_args.map((e, idx) => {
						return {
							...e,
							label: classified_counter_args[idx],
						}
					})
				}
			} catch (e) {
				false
			}
			try {
				await Promise.all(
					analysis.args.map(async (a, idx) => {
						await pinecone.upsert({
							user: query.user,
							project: query.project,
							id: `${query.sourceId}.arg.${idx}`,
							embedding: a.embedding,
							metadata: {
								project: query.project,
								sourceId: query.sourceId,
								in_favor: true,
								text: a.text,
								label: a.label ? a.label : '',
							}
						})
					})
				)
			} catch (e) {
				console.dir(`${e}`)
			}
			try {
				await Promise.all(
					analysis.counter_args.map(async (a, idx) => {
						await pinecone.upsert({
							user: query.user,
							project: query.project,
							id: `${query.sourceId}.counter_arg.${idx}`,
							embedding: a.embedding,
							metadata: {
								project: query.project,
								sourceId: query.sourceId,
								in_favor: false,
								text: a.text,
								label: a.label ? a.label : '',
							}
						})
					})
				)
			} catch (e) {
				console.dir(`${e}`)
			}
			const sourceData = (
				await axios.post(
					`https://api.raiden.ai/kb/sources/get`, {
						project: query.project,
						sourceId: query.sourceId,
						content: false,
					}, {
						headers: {
							"Content-Type": `application/json`,
							key: CONFIG.RAIDEN_AI_KEY,
						}
					}
				)
			).data
			// write to firestore
			await firestoreBIAS.doc(`userdata/${query.user}/project/${query.project}/source/${query.sourceId}`).set({
				timestamp: Date.now(),
				title: sourceData.reference.title,
				url: sourceData.reference.link,
				analysis: JSON.stringify({
					args: analysis.args,
					counter_args: analysis.counter_args,
				})
			})
			console.dir({
				added: `userdata/${query.user}/project/${query.project}/source/${query.sourceId}`
			})

			return query.sourceId
		}
	} catch (e) {
		return false
	}
	return false
}

async function add_from_search(query) {
	// query : { user , project , search_query }
	const add_response = (
		await axios.post(
			`https://api.raiden.ai/kb/sources/new`, {
				project: query.project,
				type: `search`,
				data: {
					type: `articles`,
					query: query.search_query,
					pages: 2,
				},
			}, {
				headers: {
					"Content-Type": `application/json`,
					key: CONFIG.RAIDEN_AI_KEY,
				}
			}
		)
	).data

	let sourcesIds = []
	if (add_response.sourcesIds) {
		if (add_response.sourcesIds.length) {
			sourcesIds = add_response.sourcesIds
		}
	}
	const projectDoc = await firestoreBIAS.doc(`userdata/${query.user}/project/${query.project}`).get()
	const addedSources = await Promise.all(
		sourcesIds.map(async (sourceId) => {
			const added = await analyze_source({
				user: query.user,
				project: query.project,
				statement: projectDoc.data().statement,
				sourceId,
			})
			if (added) {

				await firestoreBIAS.doc(`userdata/${query.user}/project/${query.project}`).update({
					sourcesIds: admin.firestore.FieldValue.arrayUnion(sourceId),
				})
				return added
			}
			return false
		})
	)
	console.dir({
		sourcesIds: addedSources.filter(e => e)
	})
	return {
		sourcesIds: addedSources.filter(e => e)
	}
}

async function add_from_source(query) {
	// query : { user , project , source }
	const add_response = (
		await axios.post(
			`https://api.raiden.ai/kb/sources/new`, {
				project: query.project,
				type: `list`,
				data: {
					list: !query.source.includes(`youtube.com`) ? [`url : ${query.source}`] : [`youtube : ${query.source}`],
				},
			}, {
				headers: {
					"Content-Type": `application/json`,
					key: CONFIG.RAIDEN_AI_KEY,
				}
			}
		)
	).data

	let sourcesIds = []
	if (add_response.sourcesIds) {
		if (add_response.sourcesIds.length) {
			sourcesIds = add_response.sourcesIds
		}
	}
	const projectDoc = await firestoreBIAS.doc(`userdata/${query.user}/project/${query.project}`).get()
	const addedSources = await Promise.all(
		sourcesIds.map(async (sourceId) => {
			const added = await analyze_source({
				user: query.user,
				project: query.project,
				statement: projectDoc.data().statement,
				sourceId,
			})
			if (added) {
				await firestoreBIAS.doc(`userdata/${query.user}/project/${query.project}`).update({
					sourcesIds: admin.firestore.FieldValue.arrayUnion(sourceId),
				})
				return added
			}
			return false
		})
	)
	console.dir({
		sourcesIds: addedSources.filter(e => e)
	})
	return {
		sourcesIds: addedSources.filter(e => e)
	}
}

async function search_project(query) {
	// { user , project , text }
	// semsearch, both project and close args

	const q_embedding = (
		await axios.post(
			`https://api.raiden.ai/actions/embedding`, {
				text: query.text
			}, {
				headers: {
					"Content-Type": `application/json`,
					key: CONFIG.RAIDEN_AI_KEY,
				}
			}
		)
	).data.embedding

	const in_sources = (
		await axios.post(
			`https://api.raiden.ai/actions/search`, {
				project: query.project,
				text: query.text,
				count: 6,
				filter: {
					length: {
						"$gte": 50
					},
				}
			}, {
				headers: {
					"Content-Type": `application/json`,
					key: CONFIG.RAIDEN_AI_KEY,
				}
			}
		)
	).data.results
	const in_arguments = (
		await pinecone.query({
			user: query.user,
			project: query.project,
			embedding: q_embedding,
			topK: 12,
		})
	).matches.map(e => e.metadata)

	console.dir({
		in_sources,
		in_arguments
	})

	return {
		in_sources,
		in_arguments
	}
}

async function nearest_arguments(query) {
	// { user , project , text , embedding }
	// semsearch, both project and close args

	const nearest = (
		await pinecone.query({
			user: query.user,
			project: query.project,
			embedding: query.embedding,
			topK: 7,
		})
	).matches.map(e => e.metadata).slice(1)

	console.dir({
		nearest
	})

	return {
		text: query.text,
		nearest
	}
}


async function make_clusters(query) {
	// query : { user , project , k}
	// multiple KNN & generate title with GPT
	const kmeans = require("node-kmeans");
	if (!query.k || query.k < 3 || query.k > 6) query.k = 3
	const sources = (
		await fetch_project(query)
	).map((source) => {
		let l = []
		for (let _a of source.analysis.args) l.push({
			sourceId: source.sourceId,
			title: source.title,
			url: source.url,
			type: 'arg',
			text: _a.text,
			label: _a.label,
			embedding: _a.embedding,
		})
		for (let _a of source.analysis.counter_args) l.push({
			sourceId: source.sourceId,
			title: source.title,
			url: source.url,
			type: 'counter_arg',
			text: _a.text,
			label: _a.label,
			embedding: _a.embedding,
		})
		return l
	}).flat()
	if (sources.length < query.k) return false

	const _clusters = await new Promise((resolve, reject) => {
		kmeans.clusterize(
			sources.map(e => e.embedding), {
				k: query.k
			},
			(err, res) => {
				if (err) console.error(err);
				//console.log('%o',res)
				resolve(res);
			});
	})
	let clusters = _clusters.map((c) => {
		return c.clusterInd.map((idx) => {
			return sources[idx]
		})
	}).filter(c => c.length)

	const clusters_titles = await Promise.all(
		clusters.map(async (c) => {
			return (
				await axios.post(
					`https://api.raiden.ai/actions/pipeline/run`, {
						pipelineId: `bias@raiden.ai#cluster-title`,
						query: {
							cluster: c.map(e => e.text)
						},
					}, {
						headers: {
							"Content-Type": `application/json`,
							key: CONFIG.RAIDEN_AI_KEY,
						}
					}
				)
			).data.data.cluster_title
		})
	)

	clusters = clusters.map((c, idx) => {
		return {
			title: clusters_titles[idx],
			data: c.map(s => {
				delete s.embedding;
				return s
			}),
		}
	})

	console.dir(clusters, {
		depth: 5
	})
	await firestoreBIAS.doc(`userdata/${query.user}/project/${query.project}/clusters/last`).set({
		k: query.k,
		clusters: clusters,
	})
	return clusters

}

async function fetch_project(query) {
	// { user , project}
	const projectDoc = await firestoreBIAS.doc(`userdata/${query.user}/project/${query.project}`).get()
	const sources = await Promise.all(
		projectDoc.data().sourcesIds.map(async (sourceId) => {
			try {
				const sourceDoc = await firestoreBIAS.doc(`userdata/${query.user}/project/${query.project}/source/${sourceId}`).get()
				return {
					sourceId,
					...sourceDoc.data(),
					analysis: JSON.parse(
						sourceDoc.data().analysis
					)
				}
			} catch (e) {
				return false
			}
		})
	)
	return sources.filter(e => e)
}

async function cohere_classify(query) {
	// query : { texts }

	console.dir({
		cohere: 'classify_in',
		query,
	}, {
		depth: 5
	})

	const examples = [{
			"text": "The economy is thriving and experiencing significant growth.",
			"label": "optimistic"
		},
		{
			"text": "There are concerns about the stability of the current economic climate.",
			"label": "pessimistic"
		},
		{
			"text": "The future looks uncertain, and it's difficult to predict the outcome.",
			"label": "neutral"
		},
		{
			"text": "Negative trends are impacting various industries and causing instability.",
			"label": "pessimistic"
		},
		{
			"text": "Despite challenges, there are opportunities for positive change and progress.",
			"label": "optimistic"
		},
		{
			"text": "The situation is worsening, and immediate actions are needed to address it.",
			"label": "pessimistic"
		},
		{
			"text": "Some sectors are experiencing setbacks, while others show promising signs of improvement.",
			"label": "neutral"
		},
		{
			"text": "There's a growing pessimism about the overall direction of current events.",
			"label": "pessimistic"
		},
		{
			"text": "Positive developments in certain areas are overshadowed by broader challenges.",
			"label": "neutral"
		},
		{
			"text": "The outlook is bleak, and it's essential to prepare for potential difficulties.",
			"label": "pessimistic"
		},

		{
			"text": "The market is booming, and investors are optimistic about the future.",
			"label": "optimistic"
		},
		{
			"text": "There are concerns about job security and a potential economic downturn.",
			"label": "pessimistic"
		},
		{
			"text": "The current situation calls for cautious optimism and careful planning.",
			"label": "neutral"
		},
		{
			"text": "Companies are expanding their operations and exploring new opportunities.",
			"label": "optimistic"
		},
		{
			"text": "The political landscape is uncertain, which creates anxiety among the population.",
			"label": "pessimistic"
		},
		{
			"text": "It's challenging to make definitive predictions due to rapidly changing circumstances.",
			"label": "neutral"
		},
		{
			"text": "Innovation and technological advancements continue to drive positive change.",
			"label": "optimistic"
		},
		{
			"text": "There is a growing concern about environmental sustainability and its long-term impact.",
			"label": "pessimistic"
		},
		{
			"text": "The global situation requires careful monitoring and proactive measures.",
			"label": "neutral"
		},
		{
			"text": "Entrepreneurship is thriving, with many startups achieving remarkable success.",
			"label": "optimistic"
		},
		{
			"text": "Budget cuts and resource limitations hinder progress in various sectors.",
			"label": "pessimistic"
		},
		{
			"text": "It's essential to stay informed and adapt to the changing circumstances.",
			"label": "neutral"
		},
		{
			"text": "Advancements in healthcare offer hope for better treatment and outcomes.",
			"label": "optimistic"
		},
		{
			"text": "Socioeconomic disparities and inequality continue to be pressing concerns.",
			"label": "pessimistic"
		},
		{
			"text": "The current situation requires a balanced approach and careful decision-making.",
			"label": "neutral"
		},
		{
			"text": "New investment opportunities are emerging, attracting capital and fostering growth.",
			"label": "optimistic"
		},
		{
			"text": "There is growing skepticism about government policies and their effectiveness.",
			"label": "pessimistic"
		},
		{
			"text": "The outcome depends on various factors and is subject to change.",
			"label": "neutral"
		},
		{
			"text": "Technological disruptions pose challenges but also open doors to innovation.",
			"label": "optimistic"
		},
		{
			"text": "Geopolitical tensions create uncertainty and hinder international cooperation.",
			"label": "pessimistic"
		}

	]

	const options = {
		method: 'POST',
		url: 'https://api.cohere.ai/v1/classify',
		headers: {
			accept: 'application/json',
			'content-type': 'application/json',
			authorization: 'Bearer ' + CONFIG.COHERE_KEY
		},
		data: {
			inputs: query.texts,
			examples,
			truncate: 'END'
		}
	};

	const response = (await axios.request(options)).data
	console.dir({
		cohere: 'classify_out',
		query,
		response: response.classifications.map(e => e.prediction),
	}, {
		depth: 5
	})

	return response.classifications.map(e => e.prediction)
}

async function export_data(query) {
	// query : { user , project }
	const projectDoc = await firestoreBIAS.doc(`userdata/${query.user}/project/${query.project}`).get()
	const statement = projectDoc.data().statement

	const header = `type,text,label,title,url`
	let csv_data = [header]
	const sources = await fetch_project(query)
	for (let source of sources) {
		for (let _a of source.analysis.args) {
			csv_data.push(`arg,"${_a.text.replaceAll('"','')}",${_a.label ? _a.label : ''},"${source.title.replaceAll('"','')}","${source.url.replaceAll('"','')}"`)
		}
		for (let _a of source.analysis.counter_args) {
			csv_data.push(`counter_arg,"${_a.text.replaceAll('"','')}",${_a.label ? _a.label : ''},"${source.title.replaceAll('"','')}","${source.url.replaceAll('"','')}"`)
		}
	}

	const filename = `exports/${query.project}.${Date.now()}.csv`
	let uploaded = false
	try {
		await bucket.file(filename).save(csv_data.join('\n'));
		uploaded = true
	} catch (e) {
		false
	}
	if (!uploaded) return false

	const webhookBody = {
		email: query.user,
		subject: `BIAS | Data Export (${query.project})`,
		from: `BIAS Team`,
		csv_url: `https://storage.googleapis.com/BUCKET_NAME/${filename}`,
		content: `Your data export for your project ${query.project} is ready.\n\n\nProject Statement:\n\n- ${statement}\n\n\nCheck the CSV file attached to this email.`

	}

	try {
		await axios.post(
			CONFIG.ZAPIER_WEBHOOK,
			webhookBody, {
				headers: {
					"Content-Type": `application/json`,
				}
			}
		)
	} catch (e) {
		false
	}

	return {
		csv_url: `https://storage.googleapis.com/BUCKET_NAME/${filename}`,
	}

}


async function write_report(query) {
	// query : { user , project }
	const projectDoc = await firestoreBIAS.doc(`userdata/${query.user}/project/${query.project}`).get()
	const statement = projectDoc.data().statement
	try {
		const pdfUrl = (
			await axios.post(
				`https://api.raiden.ai/actions/pipeline/run`, {
					pipelineId: `preset@raiden.ai#report-from-assignment`,
					query: {
						project: query.project,
						assignment: `Discuss briefly the following statement:\n${statement.trim()}`,
						newSources: false,
						citationStyle: 'vancouver',
						pdf: true,
					},
				}, {
					headers: {
						"Content-Type": `application/json`,
						key: CONFIG.RAIDEN_AI_KEY,
					}
				}
			)
		).data.data.pdf.url

		const webhookBody = {
			email: query.user,
			subject: `BIAS | PDF Report Generated (${query.project})`,
			from: `BIAS Team`,
			csv_url: pdfUrl, // yes yes i know
			content: `The report PDF for your project ${query.project} is ready.\n\n\nProject Statement:\n\n- ${statement}\n\n\nCheck the PDF file attached to this email.`
		}

		try {
			await axios.post(
				CONFIG.ZAPIER_WEBHOOK,
				webhookBody, {
					headers: {
						"Content-Type": `application/json`,
					}
				}
			)
		} catch (e) {
			false
		}

		return {
			pdf: pdfUrl,
		}

	} catch (e) {
		console.log(e)
	}
	return false

}


async function ask(query) {
	// query : { user , project , question }
	if (!query.question.trim().endsWith('?')) query.question = query.question.trim() + '?'
	const timestamp = Date.now()
	await firestoreBIAS.doc(`userdata/${query.user}/project/${query.project}/ask/${timestamp}`).set({
		question: query.question,
		answer: timestamp,
		status: false,
		failed: false,
		timestampQuestion: timestamp,
		timestampAnswer: false,
	}, {
		update: true
	})

	try {
		let msg = (
			await axios.post(
				`https://api.raiden.ai/actions/conversation/ask`, {
					project: query.project,
					question: query.question,
					conversationId: `bias_webapp`,
					contextMemory: false,
					sources: 4,
					user: query.user,
				}, {
					headers: {
						"Content-Type": `application/json`,
						key: CONFIG.RAIDEN_AI_KEY,
					}
				}
			)
		).data

		console.dir(msg, {
			depth: 4
		})
		await Promise.all(
			msg.sources.map(async (source, idx) => {
				try {
					const sourceDoc = await firestoreBIAS.doc(`userdata/${query.user}/project/${query.project}/source/${source.sourceId}`).get()
					msg.sources[idx] = {
						title: sourceDoc.data().title ? sourceDoc.data().title : '',
						url: sourceDoc.data().url ? sourceDoc.data().url : '',
						section: source.text.length > 100 ? source.text.slice(0, 100) + '...' : source.text,
					}
				} catch (e) {
					msg.sources[idx] = false
				}
			})
		)
		msg.sources = msg.sources.filter(e => e)
		await firestoreBIAS.doc(`userdata/${query.user}/project/${query.project}/ask/${timestamp}`).set(msg)
		return msg
	} catch (e) {
		console.log(e)
		await firestoreBIAS.doc(`userdata/${query.user}/project/${query.project}/ask/${timestamp}`).set({
			failed: true
		}, {
			merge: true
		})
		return false
	}
}


async function simulate(query) {
	// query : { user , project , rounds }
	const sources = (
		await fetch_project(query)
	).map((source, sourceIdx) => {
		let l = []
		for (let _a of source.analysis.args) l.push('+ ' + _a.text)
		for (let _a of source.analysis.counter_args) l.push('- ' + _a.text)
		l.push('\n')
		return l
	}).flat()
	if (!sources.length) return false
	const context = sources.join('\n')
	const projectDoc = await firestoreBIAS.doc(`userdata/${query.user}/project/${query.project}`).get()
	const statement = projectDoc.data().statement


	await firestoreBIAS.doc(`userdata/${query.user}/project/${query.project}/simulation/last`).set({
		timestampCreated: Date.now(),
		is_done: false,
		messages: [],
	})

	let last_response = false
	let i = -1
	while (i < query.rounds * 2) {
		i++
		const debate_state = (
			await axios.post(
				`https://api.raiden.ai/actions/pipeline/run`, {
					pipelineId: `bias@raiden.ai#simulate-debate`,
					query: last_response ? {
						...last_response.next_query,
						context: sources
							.map(value => ({
								value,
								sort: Math.random()
							}))
							.sort((a, b) => a.sort - b.sort)
							.map(({
								value
							}) => value)
							.join('\n') //shuffle
					} : {
						statement,
						context,
						stack: [],
						position: Math.random() < 0.5,
					},
				}, {
					headers: {
						"Content-Type": `application/json`,
						key: CONFIG.RAIDEN_AI_KEY,
					}
				}
			)
		).data // data of axios response

		if (debate_state.data) {
			if (debate_state.data.new_message) {
				last_response = debate_state.data
				await firestoreBIAS.doc(`userdata/${query.user}/project/${query.project}/simulation/last`).update({
					messages: last_response.next_query.stack,
				})
			}
		}

	}

	await firestoreBIAS.doc(`userdata/${query.user}/project/${query.project}/simulation/last`).update({
		timestampDone: Date.now(),
		is_done: true,
	})

	return last_response.next_query.stack
}




// ---------------------------------------------------------------------
// FIREBASE FUNCTIONS ENDPOINT : BIAS API

exports[`api`] = onCall(
	// {maxInstances : 5, memory: '1GB'},
	async (request) => {

		//await firestore.doc(`debug/${Date.now()}`).set({ status : true });
		if (!request.auth) {
			return {
				message: 'Authentication Required!',
				code: 401
			};
		}
		// await firestore.doc(`debug/email_${Date.now()}`).set({ uid : request.auth.uid, email: request.auth.token.email });
		const _query = request.data
		const user = request.auth.token.email

		// _query { type , query }
		const type = _query.type
		const query = _query.query

		if (type === `projectNew`) {
			if (query.statement) {
				return await project_new({
					user,
					statement: query.statement
				})
			}
		}
		if (type === `projectSearch`) {
			if (query.project && query.text) {
				return await search_project({
					user,
					project: query.project,
					text: query.text
				})
			}
		}
		if (type === `projectAsk`) {
			if (query.project && query.question) {
				return await ask({
					user,
					project: query.project,
					question: query.question
				})
			}
		}

		if (type === `addFromSearch`) {
			if (query.project && query.search_query) {
				return await add_from_search({
					user,
					project: query.project,
					search_query: query.search_query
				})
			}
		}
		if (type === `addFromSource`) {
			if (query.project && query.source) {
				return await add_from_source({
					user,
					project: query.project,
					source: query.source
				})
			}
		}
		if (type === `simulateDebate`) {
			if (query.project) {
				if (!query.rounds || query.rounds > 8 || query.rounds < 1) query.rounds = 3
				return await simulate({
					user,
					project: query.project,
					rounds: query.rounds
				})
			}
		}
		if (type === `makeClusters`) {
			if (query.project && query.k) {
				return await make_clusters({
					user,
					project: query.project,
					k: query.k
				})
			}
		}
		if (type === `nearestArguments`) {
			if (query.project && query.text && query.embedding) {
				return await nearest_arguments({
					user,
					project: query.project,
					text: query.text,
					embedding: query.embedding
				})
			}
		}
		if (type === `exportData`) {
			if (query.project) {
				return await export_data({
					user,
					project: query.project
				})
			}
		}
		if (type === `writeReport`) {
			if (query.project) {
				return await write_report({
					user,
					project: query.project
				})
			}
		}

		return false

	}
)
