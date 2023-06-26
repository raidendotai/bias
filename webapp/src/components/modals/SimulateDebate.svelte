<script>
import { onMount, tick } from 'svelte';
import { fade, slide } from 'svelte/transition';
import { auth , db } from '$lib/firebase';
import { doc, collection, query, onSnapshot, getDoc, orderBy, limit } from "firebase/firestore";
import { userStore , docStore } from 'sveltefire';
import { getFunctions, httpsCallable } from "firebase/functions";
const functions = getFunctions();
const api = httpsCallable(functions, 'api' , {timeout: 10 *60 *1e3});

export let show = false
export let projectId = false
export let projectStatement = false

let refresh = Date.now()
const user = userStore(auth);
let conversation = []
let conversationSubscription = false

let inProcess = false
let chatElement

let userMessage = ''

function _timeConverter(UNIX_timestamp){
  let a = new Date(UNIX_timestamp );
  let months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let year = a.getFullYear();
  let month = months[a.getMonth()];
  let date = a.getDate();
  let hour = a.getHours();
  let min = a.getMinutes();
  let sec = a.getSeconds();
  let time = month + ', ' + date + ', ' + year + ' ' + hour + ':' + min + ':' + sec;
  return time;
}

const scrollToBottom = async (node) => {
  node.scroll({ top: node.scrollHeight, behavior: 'smooth' });
};
$: if (projectId || auth) {

  if ($user?.uid != undefined && projectId && !conversationSubscription) {

	conversationSubscription = onSnapshot(doc(db, `userdata/${auth.currentUser.email}/project/${projectId}/simulation/last`), (doc) => {
		conversation = doc.data().messages
		// console.log({project})
		refresh = Date.now()
	})

  }
}
async function _scrollDown(){
  await tick();
  scrollToBottom(chatElement);
}
$: if (conversation){
  _scrollDown();
}

async function startSimulation(){
	inProcess = true

	let request = {
		type:'simulateDebate',
		query: {
			project: projectId,
			rounds: 4,
		},
	}

	try {
		const response = ( await api(request) ).data
		// const response = {order_more:'bottles'}
		// await new Promise(r => setTimeout(r, 2000));
		// console.log({response})
		inProcess = false
		return response
	}catch(e){console.log('error : ',e)}

	inProcess = false
}



function handleEnterKey(event) {
  if (event.key === "Enter") {
    if (!inProcess && userMessage.length) {
      newMessage()
    }
  }
}

</script>
<!-- component -->
<div class="flex-1 p-4 justify-between flex flex-col h-[90vh] bg-[#1a1a1a] rounded rounded-md shadow shadow-xl" style="z-index:999">
   <div on:click={()=>{show=false}} class="cursor-pointer flex sm:items-center justify-between border-b border-gray-700 hover:bg-[#111]">
      <div class="relative flex items-center space-x-4 py-2">
         <div class="flex flex-col leading-tight pb-2">
            <span class="text-2xl text-white">🤔️ &nbsp; Simulation<span class="md:hidden"><br/></span><span class="text-gray-200 text-sm md:px-2">| {projectStatement}</span> ↓</span>
         </div>
      </div>
   </div>
   <div id="messages" bind:this={chatElement}
    class="flex flex-col space-y-4 p-3 overflow-y-auto scrollbar-thumb-blue
            scrollbar-thumb-rounded scrollbar-track-blue-lighter scrollbar-w-2 scrolling-touch">

    {#key conversation}
    {#each conversation as message,messageIndex}
	  {#if message.in_favor}
      <div class="chat-message">
         <div class="flex items-end justify-end">
            <div class="flex flex-col space-y-2 text-lg max-w-3xl mx-2 order-1 items-end">
               <div>
                 <span class="px-4 py-2 rounded-lg inline-block rounded-br-none bg-[#78fab3] text-black ">
                   <span class="bg-[#111] p-1 px-2 text-base text-bold bg-opacity-30">IN FAVOR OF STATEMENT</span>
                   <br/>{message.text}
                 </span>
               </div>
            </div>
         </div>
      </div>
	  {:else}
      <div class="chat-message">
         <div class="flex items-end">
            <div class="flex flex-col space-y-2 text-lg max-w-3xl mx-2 order-2 items-start">
               <div>

               <span class="px-4 py-2 rounded-lg inline-block rounded-bl-none bg-[#de78fa] text-black">
                 <span class="bg-[#111] p-1 px-2 text-base text-bold bg-opacity-30">OPPOSING THE STATEMENT</span>
                 <br/>{message.text}
               </span>

               </div>
            </div>
         </div>
      </div>
	  {/if}


    {/each}
    {/key}

   </div>
   <div class="border-t border-gray-700 px-4 pt-4 mb-2 sm:mb-0" on:keydown={handleEnterKey} >
      <div class="relative flex">

         <span class="w-full text-white bg-[#000080]  placeholder-gray-600 pl-4 rounded-md py-3 capitalize">
			Run a new simulation
		 </span>

         <div class="absolute right-0 items-center inset-y-0 sm:flex">

            {#if !inProcess }
            <button on:click={ ()=>{ startSimulation() }}
                type="button" class="inline-flex items-center justify-center rounded-lg px-4 py-3 transition duration-500 ease-in-out text-[#000]
                                  bg-[#FF69B4] hover:bg-[#e82084] hover:text-[#eee] focus:outline-none">
               <span class="">Start Simulation</span>
            </button>
            {:else}
              {#if !inProcess}
              <button type="button" class="inline-flex items-center justify-center rounded-lg px-4 py-3 transition duration-500 ease-in-out text-white
                                    bg-gray-300 focus:outline-none">
                 <span class="">Send</span>
              </button>
              {:else}
              <button type="button" class="inline-flex items-center justify-center rounded-lg px-4 py-3 transition duration-500 ease-in-out text-white
                                    bg-gray-300 focus:outline-none">
              <svg aria-hidden="true" class="w-5 h-5 text-gray-200 animate-spin fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                             <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                             <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
                         </svg>
              </button>
              {/if}
            {/if}

         </div>
      </div>
   </div>
</div>

<style>
.scrollbar-w-2::-webkit-scrollbar {
  width: 0.25rem;
  height: 0.25rem;
}

.scrollbar-track-blue-lighter::-webkit-scrollbar-track {
  --bg-opacity: 1;
  background-color: #111;
}

.scrollbar-thumb-blue::-webkit-scrollbar-thumb {
  --bg-opacity: 1;
  background-color: #333;
}

.scrollbar-thumb-rounded::-webkit-scrollbar-thumb {
  border-radius: 0.25rem;
}
</style>
