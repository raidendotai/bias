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


const user = userStore(auth);

let newK = 3
let inProcess = false

let clusters = false
let clustersSubscription = false


$: if (projectId || auth) {

  if ($user?.uid != undefined && projectId && !clustersSubscription) {

	clustersSubscription = onSnapshot(doc(db, `userdata/${auth.currentUser.email}/project/${projectId}/clusters/last`), (doc) => {
    const docData = doc.data()
    if (docData) {
      clusters = docData.clusters
      // console.log({clusters})
    }
	})

  }
}

async function makeClusters(){
	inProcess = true
	let request = {
		type:'makeClusters',
		query: {
			project: projectId,
			k: newK,
		},
	}
	try {
		const response = ( await api(request) ).data
		inProcess = false
	}catch(e){console.log('error : ',e)}
	inProcess = false
}

</script>

<div class="flex-1 p-4 flex flex-col bg-[#0f3b1b] rounded rounded-md shadow shadow-xl" style="z-index:999">
  <div on:click={()=>{show=false}} class="cursor-pointer flex sm:items-center justify-between border-b border-gray-700
      hover:bg-[#051008]">
     <div class="relative flex items-center space-x-4 py-2">
        <div class="flex flex-col leading-tight pb-2">
           <span class="text-2xl text-white">🎯 &nbsp; Arguments Clusters<span class="md:hidden"><br/></span><span class="text-gray-200 text-sm md:px-2">| {projectStatement}</span> ↓</span>
        </div>
     </div>
  </div>

  <div class="py-2 lg:flex">
    <div class="py-4 px-4 m-1 bg-[#000] rounded rounded-md w-full lg:w-8/12">
      <div class="p-2" style="">
        Organize Arguments
        <br/>
        <span class="text-sm">
          Generate clusters for the project's data for a better organization of the analyzed arguments
        </span>
      </div>
      <div class="flex p-4 pl-2">
        <div class="w-8/12 cursor-pointer md:mr-12">
        <label for="large-range" class="block mb-2 text-gray-100 text-sm">Number of Clusters → <span class="text-lg">{newK}</span></label>
          <input type="range" bind:value={newK} min="2" max="8" step="1"
                  class="range accent-red-500 h-1 cursor-pointer w-full appearance-none bg-[#333] rounded rounded-xl"
          />
          <div class="w-full flex justify-between text-base px-2 py-2">
            {#each [...Array(7).keys()] as x,xIndex }
              <span>{x+2}</span>
            {/each}
          </div>
        </div>

        {#if !inProcess}
        <button on:click={()=>{ makeClusters() }}
        class="my-auto h-12 text-base p-2 px-3 bg-gradient-to-r bg-[#1b0f3b] to-[#0e0e59] hover:px-4 hover:text-[#FF69B4] duration-100">Make Clusters →</button>
        {:else}
        <button class="my-auto h-12 text-base p-2 px-3 bg-gray-600 text-gray-400 duration-100">Make Clusters →</button>
        {/if}
      </div>
    </div>
  </div>

  {#if !inProcess}
    {#if clusters}
    <div class="py-0 lg:flex">
      <div class="p-2 m-1 bg-[#051008] rounded rounded-md w-full">
        <div id="clusters_content">
        {#each clusters as cluster,clusterIdx}
        <div class="flex flex-col bg-gray-900 p-5">
          <h1 class="text-white font-bold text-lg px-4"><span class="text-sm">Cluster {clusterIdx+1}/{clusters.length} |</span> {cluster.title}</h1>
        	<div class="flex flex-col mt-6">
        		<div class="overflow-x-auto">
        			<div class="py-2 align-middle inline-block min-w-full px-4">
        				<div class="shadow overflow-hidden sm:rounded-lg">
        					<table class="min-w-full text-sm text-gray-400">
        						<thead class="bg-gray-800 text-xs uppercase font-medium">
        							<tr>
        								<th></th>
                        <th scope="col" class="px-6 py-3 text-left tracking-wider">
        									Position
        								</th>
        								<th scope="col" class="px-6 py-3 text-left tracking-wider">
        									Argument
        								</th>
        								<th scope="col" class="px-6 py-3 text-left tracking-wider">
        									Tone
        								</th>
        							</tr>
        						</thead>
        						<tbody class="bg-gray-800">
                      {#each cluster.data as arg,argIdx}

                      {#if arg.type === 'arg'}
        							<tr class="bg-[#0a6c2d] bg-opacity-20">
                        <td class="pl-4 text-xs">
                          {clusterIdx+1}.{argIdx+1}
                        </td>
                        <td class="text-center text-xs font-bold">
                          IN FAVOR
                        </td>
                        <td class="flex px-6 py-4 whitespace-preline-wrap break-all">
                          <p>
                            <span class="text-base">
                              {arg.text}
                            </span>
                            <br/>
                            <span class="text-gray-500">{arg.title.length < 100 ? arg.title : arg.title.slice(0,100)+'...'}</span>
                            <br/>
                            <a  href={arg.url} target='_blank'
                                class="bg-[#222] bg-opacity-70 px-1 hover:px-2 hover:text-pink-500 duration-100" >
                              {arg.url.length < 50 ? arg.url : arg.url.slice(0,50)+'...'}
                            </a>
                          </p>
                        </td>
                        <td class="text-center text-xs font-bold uppercase pr-5">
                          {arg.label}
                        </td>
        							</tr>
                      <tr class=""><td/><td/><td/><td/></tr>

                      {:else}

                      <tr class="bg-[#6c0a49] bg-opacity-20">
          								<td class="pl-4 text-xs">
          									{clusterIdx+1}.{argIdx+1}
          								</td>
                          <td class="text-center text-xs font-bold">
                            OPPOSING
                          </td>
                          <td class="flex px-6 py-4 whitespace-preline-wrap break-all">
                            <p>
                              <span class="text-base">
                                {arg.text}
                              </span>
                              <br/>
                              <span class="text-gray-500">{arg.title.length < 100 ? arg.title : arg.title.slice(0,100)+'...'}</span>
                              <br/>
                              <a  href={arg.url} target='_blank'
                                  class="bg-[#222] bg-opacity-70 px-1 hover:px-2 hover:text-pink-500 duration-100" >
                                {arg.url.length < 50 ? arg.url : arg.url.slice(0,50)+'...'}
                              </a>
                            </p>
          								</td>
                          <td class="text-center text-xs font-bold uppercase pr-5">
                            {arg.label}
                          </td>
        							</tr>
                      <tr class=""><td/><td/><td/><td/></tr>
        						  {/if}

                      {/each}
        						</tbody>
        					</table>
        				</div>
        			</div>
        		</div>
        	</div>
        </div>
        {/each}



        </div>
      </div>
    </div>
    {/if}
  {:else}
    <div class="py-0 lg:flex mx-auto">
      <span class="p-32 rounded-lg inline-block rounded-bl-none text-black">
        <svg aria-hidden="true" class="w-10 h-10 text-gray-200 animate-spin fill-green-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="#222"/>
            <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
        </svg>
      </span>
    </div>
  {/if}

</div>


<style>

</style>
