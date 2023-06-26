<script>
	import {
		goto
	} from '$app/navigation';
	import {
		page
	} from '$app/stores';
	import {
		fade,fly
	} from 'svelte/transition';
	import {
		getFunctions,
		httpsCallable
	} from "firebase/functions";

	import { facts } from "../../../components/facts.json";

	let randomFact = facts[Math.floor(Math.random() * facts.length)]
	setInterval( () => { randomFact = facts[Math.floor(Math.random() * facts.length)] } , 1e3*5 )

	import AskProject from "../../../components/modals/AskProject.svelte";
	import SimulateDebate from "../../../components/modals/SimulateDebate.svelte";
	import DeepSearch from "../../../components/modals/DeepSearch.svelte";
	import ClusterArguments from "../../../components/modals/ClusterArguments.svelte";


	const functions = getFunctions();
	const api = httpsCallable(functions, 'api' , {timeout: 10 *60 *1e3});

	import {
		auth,
		db
	} from '$lib/firebase';
	import {
		doc,
		collection,
		query,
		onSnapshot,
		getDoc,
		orderBy,
		where
	} from "firebase/firestore";
	import {
		userStore,
		docStore
	} from 'sveltefire';
	const user = userStore(auth);
	let projectId = $page.params.projectId
	let project = false
	let projectStatement = false
	let projectSubscription = false
	let sources = []
	let sourcesSubscription = false
	let newSearchQuery = ''
	let newSourceQuery = ''
	$: if (auth) {
		if ($user?.uid != undefined && !projectSubscription && projectId) {
			projectSubscription = onSnapshot(doc(db, `userdata/${auth.currentUser.email}/project/${projectId}`), (doc) => {
				project = doc.data()
				projectStatement = project.statement
				// console.log({project})
			})
		}
		if ($user?.uid != undefined && !sourcesSubscription && projectId) {
			sourcesSubscription = onSnapshot(query(collection(db, `userdata/${auth.currentUser.email}/project/${projectId}/source`), orderBy("timestamp", "desc")), (col) => {
				sources = col.docs.map(doc => {
					return {
						sourceId: doc.id,
						...doc.data(),
						analysis: JSON.parse(doc.data().analysis),
					}
				})
				// console.log({sources})
			})
		}
	}
	let nearestArguments = false

	let inProcess = false
	let showProgress = false

	let showSearch = false
	let showAsk = false
	let showClusters = false
	let showSimulation = false
	let showNearest = false
	let showExport = false
	let showReport = false

	async function callApi(request) {
		if (inProcess) return false
		inProcess = true
		/*
		let request = {
			type:'exportData',
			query: {
				project: projectId,
			},
		}
		*/
		try {
			const response = (await api(request)).data
			// const response = {order_more:'bottles'}
			// await new Promise(r => setTimeout(r, 2000));
			// console.log({response})
			inProcess = false
			return response
		} catch (e) {
			console.log('error : ', e)
		}
		inProcess = false
		return false
	}

	async function exportData() {
		showProgress = true
		const response = await callApi({
			type: 'exportData',
			query: {
				project: projectId
			}
		})
		if (response) {
			showProgress = false
			showExport = true
		}
		showProgress = false
	}

	async function writeReport() {
		showProgress = true
		const response = await callApi({
			type: 'writeReport',
			query: {
				project: projectId
			}
		})
		if (response) {
			showProgress = false
			showReport = true
		}
		showProgress = false
	}

	async function addFromSearch(sq) {
		showProgress = true
		const response = await callApi({
			type: 'addFromSearch',
			query: {
				project: projectId,
				search_query: sq
			}
		})
		newSearchQuery = ''
		showProgress = false
	}

	async function addFromSource() {
		showProgress = true
		const response = await callApi({
			type: 'addFromSource',
			query: {
				project: projectId,
				source: newSourceQuery
			}
		})
		newSourceQuery = ''
		showProgress = false
	}

	let nearestSourceIdx = false
	let nearestArgType = false
	let nearestArgIndex = false

	let nearestArgList = []

	async function getNearestArguments(_nearestSourceIdx,_nearestArgType,_nearestArgIndex) {
		if (inProcess) return false
		nearestArgList = []
		nearestSourceIdx = _nearestSourceIdx
		nearestArgType = _nearestArgType
		nearestArgIndex = _nearestArgIndex

		showProgress = true
		const response = await callApi({
			type: 'nearestArguments',
			query: {
				project: projectId,
				text: _nearestArgType === 'args'
							? sources[_nearestSourceIdx].analysis.args[_nearestArgIndex].text
							: sources[_nearestSourceIdx].analysis.counter_args[_nearestArgIndex].text,
				embedding: _nearestArgType === 'args'
							? sources[_nearestSourceIdx].analysis.args[_nearestArgIndex].embedding
							: sources[_nearestSourceIdx].analysis.counter_args[_nearestArgIndex].embedding,
			}
		})
		nearestArgList = response.nearest
		showNearest = true
		showProgress = false
	}

</script>

{#key showAsk}
{#if project && showAsk}
<div class="fixed top-0 left-0 w-[100vw] max-w-[100vw] h-[100vh] max-h-[100vh] bg-black bg-opacity-70">
	<div class="fixed bottom-[5vh] right-[5vw] w-[90vw] max-w-[90vw] h-[90vh] max-h-[90vh] overflow-y-auto"
				in:fly={{ y: 100, duration: 500 }}
				out:fly={{ y: 100, duration: 200 }}>
		<AskProject bind:show={showAsk} bind:projectStatement={projectStatement} bind:projectId={projectId}></AskProject>
	</div>
</div>
{/if}
{/key}

{#key showClusters}
{#if project && showClusters}
<div class="fixed top-0 left-0 w-[100vw] max-w-[100vw] h-[100vh] max-h-[100vh] bg-black bg-opacity-70">
	<div class="fixed bottom-[5vh] right-[5vw] w-[90vw] max-w-[90vw] h-[90vh] max-h-[90vh] overflow-y-auto"
				in:fly={{ y: 100, duration: 500 }}
				out:fly={{ y: 100, duration: 200 }}>
		<ClusterArguments bind:show={showClusters} bind:projectStatement={projectStatement} bind:projectId={projectId}></ClusterArguments>
	</div>
</div>
{/if}
{/key}

{#key showSimulation}
{#if project && showSimulation}
<div class="fixed top-0 left-0 w-[100vw] max-w-[100vw] h-[100vh] max-h-[100vh] bg-black bg-opacity-70">
	<div class="fixed bottom-[5vh] right-[5vw] w-[90vw] max-w-[90vw] h-[90vh] max-h-[90vh] overflow-y-auto"
		in:fly={{ y: 100, duration: 500 }}
		out:fly={{ y: 100, duration: 200 }}>
		<SimulateDebate bind:show={showSimulation} bind:projectStatement={projectStatement} bind:projectId={projectId}></SimulateDebate>
	</div>
</div>
{/if}
{/key}

{#key showSearch}
{#if project && showSearch}
<div class="fixed top-0 left-0 w-[100vw] max-w-[100vw] h-[100vh] max-h-[100vh] bg-black bg-opacity-70">
	<div class="fixed bottom-[5vh] right-[5vw] w-[90vw] max-w-[90vw] h-[90vh] max-h-[90vh] overflow-y-auto"
		in:fly={{ y: 100, duration: 500 }}
		out:fly={{ y: 100, duration: 200 }}>
		<DeepSearch bind:show={showSearch} bind:projectStatement={projectStatement} bind:projectId={projectId}></DeepSearch>
	</div>
</div>
{/if}
{/key}

{#if inProcess}
	{#if showProgress}
	<div class="cursor-pointer fixed bottom-5 right-[5vw] flex w-[90vw] items-center h-[20vh]
		bg-[#000080]
		hover:bg-[#111]
		overflow-y-hide
		duration-200
		border-l-4 border-pink-500 p-8 shadow-md mb-2"
		on:click={()=>
		showProgress = false}
		in:fly={{ y: 100, duration: 500 }}
		out:fly={{ y: 100, duration: 100 }}
		 >
		<div class="w-11/12 flex items-center">
			<div class="text-green-500 rounded-full mr-8">
				<div class="animate-spin inline-block w-8 h-8 border-[3px] border-current border-t-transparent text-blue-600 rounded-full" role="status" aria-label="loading">
					<span class="sr-only">Loading...</span>
				</div>
			</div>
			<div class="text-white text-xl ">
				Processing your query &nbsp;<span class="text-base duration-100 p-1 bg-[#111] ">Enjoy some random facts in the meantime 😊</span>
				{#key randomFact}
				<p in:fade={{ duration: 500 }}
							class="text-lg duration-100 mt-2">{ randomFact }</p>
				{/key}
			</div>
		</div>
	</div>
	{:else}
	<div class="cursor-pointer fixed bottom-5 right-[5vw] flex w-[90vw] items-center h-[2vh]
		bg-[#000080]
		hover:bg-[#111]
		overflow-y-hide
		duration-200
		border-l-4 border-pink-500 p-6 shadow-md mb-2"

		in:fly={{ y: -100, duration: 500 }}
		out:fly={{ y: 100, duration: 100 }}

		on:click={()=> showProgress = true} >
		<div class="w-11/12 flex items-center">
			<div class="text-green-500 rounded-full mr-8">
				<div class="animate-spin inline-block w-3 h-3 border-[3px] border-current border-t-transparent text-blue-600 rounded-full" role="status" aria-label="loading">
					<span class="sr-only">Loading...</span>
				</div>
			</div>
		</div>
	</div>
	{/if}
{/if}


{#if showExport}
<div class="cursor-pointer fixed bottom-5 right-[5vw] flex w-[90vw] items-center
	bg-[#0ec76a] duration-200
	hover:bg-[#111] text-black hover:text-white
	border-l-4 border-pink-500 p-8 shadow-md mb-2"
	on:click={()=>showExport = false}
	in:fly={{ y: 100, duration: 500 }}
	out:fly={{ y: 100, duration: 500 }}
	>
	<div class="w-9/12 flex items-center">
		<div class="text-green-500 text-3xl rounded-full mr-4">
			✅
		</div>
		<div class="text-xl ">
			Data export done ! Check your emails.
		</div>
	</div>
	<a href=''
		on:click={()=>showExport = false}
	class="hover:text-gray-900 text-3xl duration-100 text-black float float-right w-3/12 text-right">
	&nbsp; &nbsp; X
	</a>
</div>
{/if}

{#if showReport}
<div class="cursor-pointer fixed bottom-5 right-[5vw] flex w-[90vw] items-center
	bg-[#0ec76a] duration-200
	hover:bg-[#111] text-black hover:text-white
	border-l-4 border-pink-500 p-8 shadow-md mb-2"
	on:click={()=>showReport = false}
	in:fly={{ y: 100, duration: 500 }}
	out:fly={{ y: 100, duration: 500 }}
	>
	<div class="w-9/12 flex items-center">
		<div class="text-green-500 text-3xl rounded-full mr-4">
			✅
		</div>
		<div class="text-xl ">
			Report generation completed ! Check your emails.
		</div>
	</div>
	<a href=''
		on:click={()=>showReport = false}
	class="hover:text-gray-900 text-3xl duration-100 text-black float float-right w-3/12 text-right">
	&nbsp; &nbsp; X
	</a>
</div>
{/if}


<div class="container p-8 pt-0 max-w-7xl mx-auto px-1 grid lg:grid-cols-12">
	<div class="lg:col-span-6 col-span-12 p-4 pt-0">
		<div
			class="p-4 m-1
			duration-200 text-3xl
			border border-black cursor-pointer">
			<a href='/dashboard' class="text-base hover:text-gray-500 duration-200">← Back </a>
			<br/>
			{#if project}
			<span class="text-sm">STATEMENT &nbsp;</span>
			<span class="text-2xl" style="font-family:Sohne">{project.statement}</span>
			{/if}
			<br/>
			<div class="mt-2 pt-4 border-t border-[#222]">
				{#if !inProcess && sources.length}
				<button on:click={()=>{ showSearch=true; }}
				class="ml-0 m-2 text-lg p-4 bg-gradient-to-r bg-[#000080] to-[#0e0e59] hover:px-5 hover:text-[#FF69B4] duration-100">Deep Search</button>
				{:else}
				<button class="ml-0 m-2 text-lg p-4 bg-gradient-to-r bg-[#0d0d4a] text-gray-500 duration-100">Deep Search</button>
				{/if}


				{#if !inProcess && sources.length}
				<button on:click={()=>{ showAsk = !showAsk }}
				class="m-2 ml-0 text-lg p-4 bg-gradient-to-r bg-[#000080] to-[#0e0e59] hover:px-5 hover:text-[#FF69B4] duration-100">Conversation</button>
				{:else}
				<button class="m-2 ml-0 text-lg p-4 bg-gradient-to-r bg-[#0d0d4a] text-gray-500 duration-100">Conversation</button>
				{/if}


				{#if !inProcess && sources.length}
				<button on:click={()=>{showSimulation = true}}
				class="m-2 ml-0 text-lg p-4 bg-gradient-to-r bg-[#000080] to-[#0e0e59] hover:px-5 hover:text-[#FF69B4] duration-100">Simulate Debate</button>
				{:else}
				<button class="m-2 ml-0 text-lg p-4 bg-gradient-to-r bg-[#0d0d4a] text-gray-500 duration-100">Simulate Debate</button>
				{/if}


				{#if !inProcess && sources.length}
				<button on:click={()=>{ showClusters = true }}
				class="ml-0 m-2 text-lg p-4 bg-gradient-to-r bg-[#000080] to-[#0e0e59] hover:px-5 hover:text-[#FF69B4] duration-100">Arguments Clusters</button>
				{:else}
				<button class="ml-0 m-2 text-lg p-4 bg-gradient-to-r bg-[#0d0d4a] text-gray-500 duration-100">Arguments Clusters</button>
				{/if}

				{#if !inProcess && sources.length}
				<button on:click={()=>{exportData()}}
				class="m-2 ml-0 text-lg p-4 bg-gradient-to-r bg-[#000080] to-[#0e0e59] hover:px-5 hover:text-[#FF69B4] duration-100">Export Data</button>
				{:else}
				<button class="m-2 ml-0 text-lg p-4 bg-gradient-to-r bg-[#0d0d4a] text-gray-500 duration-100">Export Data</button>
				{/if}



				{#if !inProcess && sources.length}
				<button on:click={()=>{writeReport()}}
				class="m-2 ml-0 text-lg p-4 bg-gradient-to-r bg-[#000080] to-[#0e0e59] hover:px-5 hover:text-[#FF69B4] duration-100">Generate Report</button>
				{:else}
				<button class="m-2 ml-0 text-lg p-4 bg-gradient-to-r bg-[#0d0d4a] text-gray-500 duration-100">Generate Report</button>
				{/if}

			</div>
		</div>
	</div>
	<div class="lg:col-span-6 col-span-12 p-4 ">
		<div
			class="p-6 m-1
			bg-[#111] rounded rounded-md
			duration-200
			cursor-pointer">
			<h1 class="text-2xl p-2 pl-0 pb-6" style="">Analyze New Sources</h1>
			<label class="text-sm" style="">Add Source</label>
			<input type="text"
				bind:value={newSourceQuery}
				class="mt-2 mx-2 bg-[#1a1a1a] text-white p-2 text-sm lg:w-6/12 w-full border-0 outline-0 placeholder-gray-500 ring-0" placeholder="https://example.com/article" required>
			{#if !inProcess && newSourceQuery.length}
			<button on:click={()=>{ addFromSource() }}
			class="text-base p-2 bg-gradient-to-r bg-[#000080] to-[#0e0e59] hover:px-3 hover:text-[#FF69B4] duration-100">Analyze →</button>
			{:else}
			<button class="text-base p-2 bg-gray-600 text-gray-400 duration-100">Analyze →</button>
			{/if}
			<br/>
			<br/>
			<label class="mt-2 text-sm" style="">Via Search &nbsp;</label>
			<input type="text"
				bind:value={newSearchQuery}
				class="mt-2 mx-2 bg-[#1a1a1a] text-white p-2 text-sm lg:w-6/12 w-full border-0 outline-0 placeholder-gray-500 ring-0" placeholder="AI regulations" required>
			{#if !inProcess && newSearchQuery.length}
			<button on:click={()=>{ addFromSearch(newSearchQuery) }}
			class="text-base p-2 bg-gradient-to-r bg-[#000080] to-[#0e0e59] hover:px-3 hover:text-[#FF69B4] duration-100">Collect & Analyze →</button>
			{:else}
			<button class="text-base p-2 bg-gray-600 text-gray-400 duration-100">Collect & Analyze →</button>
			{/if}
			<br/>
			<br/>
			<div class="bg-[#000] py-4 px-4">
				<label class="text-gray-200 p-2" style="">Suggested Search Queries</label>
				<br/>
				<br/>
				{#if project && project.suggested_search}
				{#each project.suggested_search as sq,i}
				{#if !inProcess}
				<button on:click={()=>{ addFromSearch(sq) }}
				class="capitalize text-sm p-2 m-1 bg-gradient-to-r bg-[#000080] to-[#0e0e59] hover:px-3 hover:text-[#FF69B4] duration-100">{sq} →</button>
				{:else}
				<button
					class="capitalize text-sm p-2 m-1 bg-gray-600 text-gray-400 duration-100">{sq} →</button>
				{/if}
				{/each}
				{/if}
			</div>
		</div>
	</div>
	<div class="pt-4 mt-4 border-t border-[#222] col-span-12 lg:grid lg:grid-cols-12">
		{#if sources}
		{#each sources as source,sourceIdx}
		<div class="col-span-12 lg:col-span-6 m-2 border border-[#222] bg-black"
					transition:fade >
			<div class="col-span-12 lg:col-span-3 p-4" >
				<div style=""
					class="p-1 px-2
					bg-black hover:bg-[#000080] hover:text-[#FF69B4] hover:px-4
					cursor-pointer duration-200 whitespace-pre-wrap break-all">
					<a href={source.url} target='_blank'>
					{source.title}
					<br/>
					<span class="text-xs break-all text-gray-300">
					{source.url.length < 70 ? source.url : source.url.slice(0,70)+'...'}
					</span>
					</a>
				</div>
			</div>
			<div class="col-span-12 lg:col-span-9 p-4 pt-0 grid lg:grid-cols-12 text-sm">
				{#if source.analysis.args.length}
				{#each source.analysis.args as arg,argIdx}

					{#if showNearest && nearestSourceIdx === sourceIdx && nearestArgType === 'args' && nearestArgIndex === argIdx}
					<div on:click={()=>{ (!showNearest) ? getNearestArguments(sourceIdx,'args',argIdx) : showNearest = false }}
						style="z-index:99;"
						class="col-span-12 lg:col-span-6
						p-4 m-1 hover:mx-2
						duration-200
						bg-gradient-to-br from-[#0a6c2d] to-black
						hover:from-black hover:to-black hover:text-white border border-black hover:border hover:border-[#222] cursor-pointer">
						<span class="p-1 text-xs bg-black uppercase">IN FAVOR</span>
						{#if arg.label}
						<span class="p-1 text-xs bg-black uppercase">{arg.label} tone</span>
						{/if}
						<br/><br/>
						<span style="font-family:SohneMono;">+</span> &nbsp; {arg.text}
					</div>
					{:else}
					<div on:click={()=>{ (!showNearest) ? getNearestArguments(sourceIdx,'args',argIdx) : showNearest = false }}
						class="col-span-12 lg:col-span-6
						p-4 m-1 hover:mx-2
						duration-200
						bg-gradient-to-br from-[#0a6c2d] to-black
						hover:from-black hover:to-black hover:text-white border border-black hover:border hover:border-[#222] cursor-pointer">
						<span class="p-1 text-xs bg-black uppercase">IN FAVOR</span>
						{#if arg.label}
						<span class="p-1 text-xs bg-black uppercase">{arg.label} tone</span>
						{/if}
						<br/><br/>
						<span style="font-family:SohneMono;">+</span> &nbsp; {arg.text}
					</div>
					{/if}

					{#if showNearest && nearestSourceIdx === sourceIdx && nearestArgType === 'args' && nearestArgIndex === argIdx}
					<div class="fixed top-0 left-0 w-[100vw] max-w-[100vw] h-[100vh] max-h-[100vh] bg-black bg-opacity-70">
					</div>
					{#each nearestArgList as relevantArg,relevantArgIndex}
						{#if relevantArg.in_favor}
							<div style="z-index:99" on:click={()=>{ showNearest = false }}
								class="col-span-12 lg:col-span-6 p-4 m-1 hover:mx-2 duration-200
								bg-gradient-to-l from-[#0a6c2d] to-[#111]
								hover:from-black hover:to-black hover:text-white border border-black hover:border hover:border-[#222] cursor-pointer">
								<span class="p-1 text-xs bg-black uppercase">Relevant</span>
								<span class="p-1 text-xs bg-black uppercase">IN FAVOR</span>
								{#if arg.label}
								<span class="p-1 text-xs bg-black uppercase">{relevantArg.label} tone</span>
								{/if}
								<br/>
								<br/>
								<span style="font-family:SohneMono;">+</span> &nbsp; {relevantArg.text}
							</div>
						{:else}
							<div style="z-index:99"  on:click={()=>{ showNearest = false }}
								class="col-span-12 lg:col-span-6 p-4 m-1 hover:mx-2 duration-200
								bg-gradient-to-l from-[#6c0a49] to-[#111]
								hover:from-black hover:to-black hover:text-white border border-black hover:border hover:border-[#222] cursor-pointer">
								<span class="p-1 text-xs bg-black uppercase">Relevant</span>
								<span class="p-1 text-xs bg-black uppercase">OPPOSING</span>
								{#if arg.label}
								<span class="p-1 text-xs bg-black uppercase">{relevantArg.label} tone</span>
								{/if}
								<br/>
								<br/>
								<span style="font-family:SohneMono;">-</span> &nbsp; {relevantArg.text}
							</div>
						{/if}
					{/each}
					{/if}

				{/each}
				{/if}




				{#if source.analysis.counter_args.length}
				{#each source.analysis.counter_args as arg,argIdx}

					{#if showNearest && nearestSourceIdx === sourceIdx && nearestArgType === 'counter_args' && nearestArgIndex === argIdx}
					<div on:click={()=>{ (!showNearest) ? getNearestArguments(sourceIdx,'counter_args',argIdx) : showNearest = false }}
						style="z-index:99;"
						class="col-span-12 lg:col-span-6
						p-4 m-1 hover:mx-2
						duration-200
						bg-gradient-to-br from-[#6c0a49] to-black
						hover:from-black hover:to-black hover:text-white border border-black hover:border hover:border-[#222] cursor-pointer">
						<span class="p-1 text-xs bg-black uppercase">OPPOSING</span>
						{#if arg.label}
						<span class="p-1 text-xs bg-black uppercase">{arg.label} tone</span>
						{/if}
						<br/><br/>
						<span style="font-family:SohneMono;">-</span> &nbsp; {arg.text}
					</div>
					{:else}
					<div on:click={()=>{ (!showNearest) ? getNearestArguments(sourceIdx,'counter_args',argIdx) : showNearest = false }}
						class="col-span-12 lg:col-span-6
						p-4 m-1 hover:mx-2
						duration-200
						bg-gradient-to-br from-[#6c0a49] to-black
						hover:from-black hover:to-black hover:text-white border border-black hover:border hover:border-[#222] cursor-pointer">
						<span class="p-1 text-xs bg-black uppercase">OPPOSING</span>
						{#if arg.label}
						<span class="p-1 text-xs bg-black uppercase">{arg.label} tone</span>
						{/if}
						<br/><br/>
						<span style="font-family:SohneMono;">-</span> &nbsp; {arg.text}
					</div>
					{/if}


					{#if showNearest && nearestSourceIdx === sourceIdx && nearestArgType === 'counter_args' && nearestArgIndex === argIdx}
					<div class="fixed top-0 left-0 w-[100vw] max-w-[100vw] h-[100vh] max-h-[100vh] bg-black bg-opacity-70">
					</div>
					{#each nearestArgList as relevantArg,relevantArgIndex}
						{#if relevantArg.in_favor}
							<div style="z-index:99" on:click={()=>{ showNearest = false }}
								class="col-span-12 lg:col-span-6 p-4 m-1 hover:mx-2 duration-200
								bg-gradient-to-l from-[#0a6c2d] to-[#111]
								hover:from-black hover:to-black hover:text-white border border-black hover:border hover:border-[#222] cursor-pointer">
								<span class="p-1 text-xs bg-black uppercase">Relevant</span>
								<span class="p-1 text-xs bg-black uppercase">IN FAVOR</span>
								{#if arg.label}
								<span class="p-1 text-xs bg-black uppercase">{relevantArg.label} tone</span>
								{/if}
								<br/>
								<br/>
								<span style="font-family:SohneMono;">+</span> &nbsp; {relevantArg.text}
							</div>
						{:else}
							<div style="z-index:99"  on:click={()=>{ showNearest = false }}
								class="col-span-12 lg:col-span-6 p-4 m-1 hover:mx-2 duration-200
								bg-gradient-to-l from-[#6c0a49] to-[#111]
								hover:from-black hover:to-black hover:text-white border border-black hover:border hover:border-[#222] cursor-pointer">
								<span class="p-1 text-xs bg-black uppercase">Relevant</span>
								<span class="p-1 text-xs bg-black uppercase">OPPOSING</span>
								{#if arg.label}
								<span class="p-1 text-xs bg-black uppercase">{relevantArg.label} tone</span>
								{/if}
								<br/>
								<br/>
								<span style="font-family:SohneMono;">-</span> &nbsp; {relevantArg.text}
							</div>
						{/if}
					{/each}
					{/if}

				{/each}



				{/if}
			</div>
		</div>
		{/each}
		{/if}
	</div>
</div>
<style></style>
