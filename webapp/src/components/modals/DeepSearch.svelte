<script>
import { onMount, tick } from 'svelte';
import { fade, slide } from 'svelte/transition';
import { auth , db } from '$lib/firebase';
import { doc, collection, query, onSnapshot, getDoc, orderBy, limit } from "firebase/firestore";
import { userStore , docStore } from 'sveltefire';
import { getFunctions, httpsCallable } from "firebase/functions";
const functions = getFunctions();
const api = httpsCallable(functions, 'api' , {timeout: 10 *60 *1e3});


export let show = false;
export let projectId = false;
export let projectStatement = false;

let searchQuery = ''
let inProcess = false
let results = {
  sources : [],
  arguments : [],
}


async function newSearch(){
	inProcess = true

	let request = {
		type:'projectSearch',
		query: {
			project: projectId,
			text: searchQuery,
		},
	}

	try {
		const response = ( await api(request) ).data
		// const response = {order_more:'bottles'}
		// await new Promise(r => setTimeout(r, 2000));
		console.log(response)

    results = {
      sources : response.in_sources.map( (e) => {
        return {
          text : e.text,
          title : e.metadata.title,
        }
      }),
      arguments : response.in_arguments,
    }

		inProcess = false
	}catch(e){console.log('error : ',e)}

	inProcess = false
}

</script>

<div class="flex-1 p-4 flex flex-col h-[90vh] bg-[#03031c] rounded rounded-md shadow shadow-xl" style="z-index:999">
  <div on:click={()=>{show=false}} class="cursor-pointer flex sm:items-center justify-between border-b border-gray-700
      hover:bg-[#000060]">
     <div class="relative flex items-center space-x-4 py-2">
        <div class="flex flex-col leading-tight pb-2">
           <span class="text-2xl text-white">🔎️ &nbsp; Deep Search<span class="md:hidden"><br/></span><span class="text-gray-200 text-sm md:px-2">| {projectStatement}</span> ↓</span>
        </div>
     </div>
  </div>

  <div class="py-2 lg:flex">
    <div class="py-4 px-4 m-1 bg-[#000] rounded rounded-md w-full lg:w-9/12 pb-8">
      <div class="p-2" style="">
        Deep Search
        <br/>
        <span class="text-sm">
          Look into both project sources & analyzed arguments for the most relevant data related to your query
        </span>
      </div>
      <input type="text"
        bind:value={searchQuery}
        class="mx-2 bg-gray-200 text-black p-2 text-base lg:w-9/12 w-full border-0 outline-0 placeholder-gray-500 ring-0" placeholder="Singularity Threats" required>
      {#if !inProcess && searchQuery.length}
      <button on:click={()=>{ newSearch() }}
      class="text-base p-2 px-3 bg-gradient-to-r bg-[#000080] to-[#0e0e59] hover:px-4 hover:text-[#FF69B4] duration-100">Search →</button>
      {:else}
      <button class="text-base p-2 px-4 bg-gray-600 text-gray-400 duration-100">Search →</button>
      {/if}
    </div>
  </div>

  {#if !inProcess}
    {#if results.sources.length || results.arguments.length}
    <div class="py-0 lg:flex">
      <div class="p-4 m-1 bg-[#000080] rounded rounded-md w-full">
        <div class="p-2 py-1" style="">
          Results
        </div>
        <div class="grid lg:grid-cols-2 p-1">
          <div class="overflow-y-auto p-2 m-1 bg-[#03031c]">
            <h1 class="text-sm text-gray-200 border-b border-[#888] pb-2">In Sources</h1>
            {#each results.sources as source,sourceIndex}
              <div class="p-1 m-1 border-b border-[#333] pb-2">
                <p class="whitespace-pre-wrap break-all bg-[#000080] capitalize p-1 text-xs ">
                {source.title}
                </p>
                <p class="p-2 whitespace-pre-wrap break-all text-sm">{source.text}</p>
              </div>
            {/each}
          </div>
          <div class="overflow-y-auto p-2 m-1 bg-[#03031c]">
            <h1 class="text-sm text-gray-200 border-b border-[#888] pb-2">In Arguments</h1>

            {#each results.arguments as arg,argIndex}

              {#if arg.in_favor}
              <div class="p-1 m-1 pb-2 bg-[#00822e]">
                <p class="p-2 pb-0 whitespace-pre-wrap break-all text-sm">
                  <span style="font-family:SohneMono;">+</span> &nbsp; {arg.text}
                </p>
              </div>
              {:else}
              <div class="p-1 m-1 pb-2 bg-[#6c0a49]">
                <p class="p-2 pb-0 whitespace-pre-wrap break-all text-sm">
                  <span style="font-family:SohneMono;">-</span> &nbsp; {arg.text}
                </p>
              </div>
              {/if}

            {/each}

          </div>
        </div>
      </div>
    </div>
    {/if}
  {:else}
    <div class="py-0 lg:flex mx-auto">
      <span class="p-32 rounded-lg inline-block rounded-bl-none text-black">
        <svg aria-hidden="true" class="w-10 h-10 text-gray-200 animate-spin fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
            <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
        </svg>
      </span>
    </div>
  {/if}

</div>


<style>

</style>
