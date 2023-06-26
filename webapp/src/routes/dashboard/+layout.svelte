<script>
import { goto } from '$app/navigation';
import { page } from '$app/stores';
import { fade , fly } from 'svelte/transition';
import { getFunctions, httpsCallable } from "firebase/functions";
const functions = getFunctions();
const api = httpsCallable(functions, 'api' , {timeout: 10 *60 *1e3});


import { auth , db } from '$lib/firebase';
import { doc, collection, query, onSnapshot, getDoc, orderBy, where } from "firebase/firestore";
import { userStore , docStore } from 'sveltefire';
const user = userStore(auth);

let projects = []
let projectsSubscription = false

let newProjectStatement = ''

$: if (auth) {
	if ($user?.uid != undefined && !projectsSubscription) {
		projectsSubscription = onSnapshot(
			query(
				collection(db,`userdata/${auth.currentUser.email}/project`),
				orderBy("timestamp", "desc")
			), (col) => {
			projects = col.docs.map( doc => {
				return {
					projectId: doc.id,
					...doc.data(),
					n_sources : doc.data().sourcesIds.length,
				}
			})
			console.log({projects})
		})
	}

}

let inProcess = false
let showProgress = false

async function callApi(request){
	if (inProcess) return false
	inProcess = true
	try {
		const response = ( await api(request) ).data
		// const response = {order_more:'bottles'}
		// await new Promise(r => setTimeout(r, 2000));
		// console.log({response})
		goto('/project/' + response.project)
		inProcess = false
		return response
	}catch(e){console.log('error : ',e)}
	inProcess = false
	return false
}
async function newProject(){
	if (newProjectStatement.length < 5) return false
	showProgress = true
	const response = await callApi({type:'projectNew',query:{statement:newProjectStatement}})
	showProgress = false
}

</script>

{#if inProcess && showProgress}
<div class="cursor-pointer fixed bottom-5 right-[5vw] flex w-[90vw] items-center
    bg-gradient-to-r from-[#000080] to-[#0e0e59] duration-200
    border-l-4 border-pink-500 p-8 shadow-md mb-2"
	on:click={()=>showProgress = false} style="z-index:88;">
	<div class="w-9/12 flex items-center">
	  <div class="text-green-500 rounded-full mr-8">
		<div class="animate-spin inline-block w-8 h-8 border-[3px] border-current border-t-transparent text-blue-600 rounded-full" role="status" aria-label="loading">
		  <span class="sr-only">Loading...</span>
		</div>
	  </div>

	  <div class="text-white text-xl ">
		Processing your query
	  </div>
  </div>
  <a href=''
	on:click={()=>showProgress = false}
	class="hover:text-white text-3xl duration-100 text-gray-500 float float-right w-3/12 text-right">
    &nbsp; &nbsp; X
  </a>
</div>
{/if}

<div class="container p-8 pt-0 max-w-7xl mx-auto px-1 my-10">

  <div class="relative overflow-x-auto my-4 ">
    <h1 class="p-4 mt-4 pb-0 text-4xl font-bold" style="font-family:Sohne">🤔 New Project</h1>
    <h2 class="p-4 mt-1 text-2xl" style="font-family:SohneLight">Describe the statement you want to research</h2>
    <div class="px-4">
      <input bind:value={newProjectStatement}
			type="text"
          class="bg-[#1a1a1a] text-white p-2 px-4 text-2xl lg:w-10/12 w-full border-0 outline-0 placeholder-gray-500 ring-0"
          placeholder="AGI is a threat to humans" required>
	{#if !inProcess && newProjectStatement.length >= 5}
      <button on:click={()=>{newProject()}}
		class="mt-4 lg:mt-0 lg:mx-2 text-xl p-3 px-4 bg-purple-900 hover:bg-purple-700 duration-200">
        Create Project →
      </button>
	{:else}
      <button
		class="mt-4 lg:mt-0 lg:mx-2 text-xl p-3 px-4 bg-purple-400 text-gray-500  duration-200">
        Create Project →
      </button>
	{/if}
    </div>
  </div>

  <div class="relative overflow-x-auto mt-4 border-t border-[#222]">
    <h1 class="p-4 my-4 text-4xl font-bold" style="font-family:Sohne">📰 My Feed</h1>
    <div class="p-4">
      <table class="w-full text-lg text-left text-black">
		{#if projects.length}
          <tbody>
            {#each projects as project,projectIdx}
              <tr	in:fly={{ y: -100, duration: 100*(projectIdx+1) }}
									on:click={()=>{ goto('/project/' + project.projectId ) }}
                  class="bg-[#111] text-white border-b border-[#222] cursor-pointer hover:bg-[#222] hover:text-purple-500 duration-200">
                  <th scope="row" class="px-6 py-4 font-medium whitespace-nowrap break-all dark:text-white">
                      {project.statement} →
                  </th>
                  <td class="px-6 py-4">
                      {project.n_sources} source(s)
                  </td>
              </tr>
            {/each}
          </tbody>
		{/if}
      </table>
    </div>
  </div>

<!--
	<div class="lg:col-span-6 col-span-12 p-4">
			<div
			class="p-4 m-1
			duration-200 text-3xl
			border border-black cursor-pointer">
				<span class="text-lg hover:text-gray-500 duration-200">← / Statement </span>
        <br/><span class="text-4xl font-bold" style="font-family:Sohne">AR/VR is psychologically harmful</span>
        <br/>
        <div class="">
          <span style="font-family:Aeonik;" class="text-sm p-2 bg-gradient-to-br from-[#46029a] hover:from-black hover:bg-[#46029a] duration-200">Export as CSV</span>
        </div>
		</div>
	</div>
  <div class="lg:col-span-6 col-span-12 p-4 ">
			<div
  			class="p-4 m-1
        bg-[#111] rounded rounded-md
  			duration-200
  			cursor-pointer">
          <label class="" style="font-family:Aeonik;">Add Source</label>
          <input type="text"
              class="mt-2 mx-2 bg-[#1a1a1a] text-white p-2 text-sm lg:w-6/12 w-full border-0 outline-0 placeholder-gray-500 ring-0" placeholder="https://example.com/article" required>
          <span class="text-sm p-2 bg-gradient-to-br from-[#46029a] hover:from-black hover:bg-[#46029a] duration-200">Analyze →</span>
          <br/><br/>
          <label class="mt-2" style="font-family:Aeonik;">New Search</label>
          <input type="text"
              class="mt-2 mx-2 bg-[#1a1a1a] text-white p-2 text-sm lg:w-6/12 w-full border-0 outline-0 placeholder-gray-500 ring-0" placeholder="https://example.com/article" required>
          <span class="text-sm p-2 bg-gradient-to-br from-[#46029a] hover:from-black hover:bg-[#46029a] duration-200">Collect & Analyze →</span>

		</div>
	</div>

	{#each [0,1,2,3,4,5,6,7,8,9] as p,pidx}
	<div class="col-span-12 lg:col-span-6 p-1 m-1 bg-[#0e0e0e]">

		<div class="col-span-12 lg:col-span-3 p-4" >
				<div style="font-family:Aeonik;"
				class="p-4 m-1
				text-lg
        bg-gradient-to-br from-[#46029a] hover:from-black hover:bg-[#46029a]
				border border-black
        cursor-pointer duration-200">
					Fred Again Boiler Room {pidx}
					<br/>
					<span style="font-family:'SohneMono',serif;"
							class="text-xs break-all">
						https://boiler_room.tv/article/2013/obama
					</span>
			</div>
		</div>
		<div class="col-span-12 lg:col-span-9 p-4 pt-0 grid lg:grid-cols-12 text-sm">

			{#each [`Researcher at Microsoft claimed to detect spark of AGI in GPT-4`,
					`Sam Altman and Demis Hassabis, who run the world’s two leading AI labs, are confident that AGI is possible`,
					`Central estimate on the prediction market Metaculus for the arrival of a basic form of AGI is currently 2026`]
			as e,i}
			<div class="col-span-12 lg:col-span-4
				p-4 m-1 hover:mx-2
				duration-200

				bg-gradient-to-br from-[#0a6c2d] to-black
				hover:from-black hover:to-black hover:text-white border border-black hover:border hover:border-[#222] cursor-pointer">
				<span style="font-family:SohneMono;">+</span> &nbsp; {e}
			</div>
			{/each}
			{#each [`Kenneth Cukier, the Deputy Executive Editor of The Economist, is increasingly skeptical that AGI is possible`,
					`Cukier thinks an AI which has all the cognitive abilities of an adult human is crazy and unattainable`,
					`Cukier thinks machines can never become conscious, whatever AI engineers may claim about consciousness`]
			as e,i}
			<div class="col-span-12 lg:col-span-4
				p-4 m-1 hover:mx-2
				duration-200
				shadow shadow-2xl
				bg-gradient-to-br from-[#6c0a49] to-black
				hover:from-black hover:to-black hover:text-white border border-black hover:border hover:border-[#222] cursor-pointer">
				<span style="font-family:SohneMono;">-</span> &nbsp; {e}
			</div>
			{/each}
		</div>
	</div>
	{/each}

-->
</div>

<style>
</style>
