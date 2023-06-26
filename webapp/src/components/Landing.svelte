<script>
const characters =' .,;-ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function generateString() {
    let result = ' ';
	const length = Math.random() * (100 - 10) + 10
    const charactersLength = characters.length;
    for ( let i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    return result;
}

</script>


<div class="container p-8 pt-0 max-w-7xl mx-auto px-1 my-10">



<div class="pt-4 pb-24 pb-10 overflow-hidden">
  <div class="px-4 mx-auto">
    <div class="flex flex-wrap -m-8">
      <div class="w-full md:w-1/2 p-8">
        <div class="md:max-w-lg">
          <span class="inline-block mb-2 px-3 py-1 text-gray-500 font-semibold bg-[#222] rounded-full">DEMO LAUNCH</span>
          <h1 class="font-bold cursor-pointer duration-200 font-heading mb-4 text-8xl
                      bg-clip-text bg-gradient-to-tl from-blue-600 to-violet-600 hover:from-[#444] hover:to-white duration-200 text-transparent">
            BIAS
          </h1>
          <h1 class="duration-200 font-heading mb-12 text-3xl text-white">
          The BIAS project stems from a belief in <span class="font-bold">healthy debate contexts</span>
          <br/><span class="">• Navigate the flow of information on issues you are interested in, with the help of AI</span>
          <br/><span class="">• Automated analysis, extraction of arguments and counter-arguments from any source
          <br/><span class="">• Source-backed conversational features, exports and more
          </h1>
        </div>
      </div>
      <div class="w-full md:w-1/2 p-0 overflow-clip">
        <video class="md:w-1/2 hidden md:block md:max-h-[80vh] absolute object-cover overflow-clip opacity-20" src="landing.mp4" type="video/mp4" autoplay muted loop></video>
      </div>
    </div>
  </div>
</div>




<!--
<div class="bg-slate-900">
  <div class="bg-gradient-to-b from-violet-600/[.15] via-transparent">
    <div class="max-w-[85rem] mx-auto px-4 sm:px-6 lg:px-8 py-24 space-y-8">
      <div class="flex justify-center">
        <a class="group inline-block bg-white/[.05] hover:bg-white/[.1] border border-white/[.05] p-1 pl-4 rounded-full shadow-md" href="../figma.html">
          <p class="mr-2 inline-block text-white text-sm">
            Preline UI Figma is live.
          </p>
          <span class="group-hover:bg-white/[.1] py-2 px-3 inline-flex justify-center items-center gap-x-2 rounded-full bg-white/[.075] font-semibold text-white text-sm">
            <svg class="w-2.5 h-2.5" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M5.27921 2L10.9257 7.64645C11.1209 7.84171 11.1209 8.15829 10.9257 8.35355L5.27921 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </span>
        </a>
      </div>

      <div class="max-w-3xl text-center mx-auto">
        <h1 class="block font-medium text-gray-200 text-4xl sm:text-5xl md:text-6xl lg:text-7xl">
          Now it's easier than ever to build products
        </h1>
      </div>

      <div class="max-w-3xl text-center mx-auto">
        <p class="text-lg text-gray-400">Preline is a large open-source project, crafted with Tailwind CSS framework by Hmlstream.</p>
      </div>

      <div class="text-center">
        <a class="inline-flex justify-center items-center gap-x-3 text-center bg-gradient-to-tl from-blue-600 to-violet-600 shadow-lg shadow-transparent hover:shadow-blue-700/50 border border-transparent text-white text-sm font-medium rounded-full focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 focus:ring-offset-white py-3 px-6 dark:focus:ring-offset-gray-800" href="#">
          Get started
          <svg class="w-2.5 h-2.5" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M5.27921 2L10.9257 7.64645C11.1209 7.84171 11.1209 8.15829 10.9257 8.35355L5.27921 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </a>
      </div>
    </div>
  </div>
</div>
-->

<!--
  <div class="container relative overflow-x-auto mt-4 border-t border-[#222]">
    <h1 class="p-4 my-4 text-4xl font-bold" style="font-family:Sohne">🔥 Trending Debates</h1>
    <div class="p-4">
      <table class="w-full text-2xl text-left text-black">

          <tbody>
            {#each [...Array(5).keys()] as statement,statementIdx}
              <tr class="bg-[#111] text-white border-b border-[#222] cursor-pointer hover:bg-[#222] hover:text-purple-500 duration-200">
                  <th scope="row" class="px-6 py-4 font-medium whitespace-nowrap break-all">
                      AI should be regulated by legislation because obama does not like you →
                  </th>
              </tr>
            {/each}
          </tbody>
      </table>
    </div>
  </div>
-->



</div>

<style>
</style>
