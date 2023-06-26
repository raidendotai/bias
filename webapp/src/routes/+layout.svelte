<svelte:head>
    <title>BIAS | Pinecone Hackaton</title>
</svelte:head>
<script>
import "../app.css";
import { page } from '$app/stores';
import Header from "../components/Header.svelte";
import Footer from "../components/Footer.svelte";
import Landing from "../components/Landing.svelte";

</script>


<Header></Header>

<div class="min-h-[100vh] container">
{#if $page.route.id != '/'}
  <slot></slot>
{:else}
  <Landing></Landing>
{/if}
</div>


<Footer></Footer>
<style>
.container {
  background-image: radial-gradient(#1a1a1a 1px, transparent 0);
  background-size: 25px 25px;
  background-position: -19px -19px;

}
</style>
