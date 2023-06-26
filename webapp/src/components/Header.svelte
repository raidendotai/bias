<script>
import { goto } from '$app/navigation';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth , db } from '$lib/firebase';
import { userStore , docStore } from 'sveltefire';
const googleAuthProvider = new GoogleAuthProvider();
const user = userStore(auth)

let userEmail = false

async function userLoginGoogle(){
  try {
  const status = await signInWithPopup(auth, googleAuthProvider)
  }catch(e){console.log(e)}
}
async function userLogout(){
  await signOut(auth)
  goto('/')
}
$: if (user) {
	if ($user?.uid != undefined) {
		userEmail = auth.currentUser.email
	} else {userEmail = false}
}

</script>

<div class="relative isolate flex items-center gap-x-6 overflow-hidden bg-[#000080] text-[#FF69B4] px-6 py-2.5 sm:px-3.5 sm:before:flex-1">
  <div class="absolute left-[max(-7rem,calc(50%-52rem))] top-1/2 -z-10 -translate-y-1/2 transform-gpu blur-2xl" aria-hidden="true">
    <div class="aspect-[577/310] w-[36.0625rem] bg-gradient-to-r from-pink-300 to-pink-600 opacity-30" style="clip-path: polygon(74.8% 41.9%, 97.2% 73.2%, 100% 34.9%, 92.5% 0.4%, 87.5% 0%, 75% 28.6%, 58.5% 54.6%, 50.1% 56.8%, 46.9% 44%, 48.3% 17.4%, 24.7% 53.9%, 0% 27.9%, 11.9% 74.2%, 24.9% 54.1%, 68.6% 100%, 74.8% 41.9%)"></div>
  </div>
  <div class="absolute left-[max(45rem,calc(50%+8rem))] top-1/2 -z-10 -translate-y-1/2 transform-gpu blur-2xl" aria-hidden="true">
    <div class="aspect-[577/310] w-[36.0625rem] bg-gradient-to-r from-pink-200 to-pink-300 opacity-30" style="clip-path: polygon(74.8% 41.9%, 97.2% 73.2%, 100% 34.9%, 92.5% 0.4%, 87.5% 0%, 75% 28.6%, 58.5% 54.6%, 50.1% 56.8%, 46.9% 44%, 48.3% 17.4%, 24.7% 53.9%, 0% 27.9%, 11.9% 74.2%, 24.9% 54.1%, 68.6% 100%, 74.8% 41.9%)"></div>
  </div>
  <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
    <p class="text-sm leading-6 md:py-1 font-medium">
      <strong class="font-semibold">PINECONE HACKATON</strong><svg viewBox="0 0 2 2" class="mx-2 inline h-0.5 w-0.5 fill-current" aria-hidden="true"><circle cx="1" cy="1" r="1" /></svg><span class="md:hidden"><br/></span>BIAS is an experimental project made by RAIDEN AI
    </p>
  </div>
  <div class="flex flex-1 justify-end">
  </div>
</div>

{#key userEmail}
              <div class="w-full mx-auto bg-black border-b border-[#222] 2xl:max-w-8xl md:px-32">
                <div class="relative flex flex-col w-full p-5 mx-auto bg-black md:items-center md:justify-between md:flex-row md:px-6 lg:px-8">
                  <div class="flex flex-row items-center justify-between lg:justify-start">
                    <a class="text-xl tracking-widest text-white hover:text-gray-500 uppercase focus:outline-none " href="/">
                      BIAS
                    </a>
                  </div>
                  <nav class="flex-col items-center flex-grow md:pb-0 md:flex md:justify-end md:flex-row">
                  <div class="sm:hidden"><br/></div>
                  {#if userEmail}
                    <a class="duration-200 px-2 py-2 text-white lg:px-6 md:px-3 hover:bg-[#000080] hover:text-[#FF69B4] hover:mx-2 duration-300 hover:font-medium lg:ml-auto" href="/dashboard">
                      Dashboard
                    </a>
                    <a on:click={()=>userLogout()} class="duration-200 px-2 py-2 text-red-500 lg:px-6 md:px-3 hover:bg-red-500 hover:text-white" href="#">
                      Logout
                    </a>
                    {:else}

                    <div class="inline-flex w-full mt-4 md:mt-0 md:w-64 items-center gap-2 list-none lg:ml-auto">
                      <button on:click={()=>userLoginGoogle()}
                        class="w-full group relative flex h-11 items-center px-6 absolute inset-0 rounded-full bg-[#111]
                        border border-[#111] duration-300 disabled:bg-gray-300 hover:bg-[#222] text-white">
                        <span class="w-full relative flex justify-center items-center gap-3 text-base font-medium text-sm">
                          <img src="/google.svg" class="absolute left-0 w-5" alt="google logo" />
                          <span>Login With Google</span>
                        </span>
                      </button>
                    </div>
                    {/if}

                  </nav>
                </div>
              </div>
{/key}
