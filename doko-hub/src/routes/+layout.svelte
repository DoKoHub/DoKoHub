<!--TODO: Check for login
	1. Send request to backend to get player id
	2. If that fails, redirect to login page
	3. Else, render requested page
-->
<script lang="ts">
  import favicon from "$lib/assets/favicon.svg";

  let { children } = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

{@render children?.()}

<style>
  :global(body) {
    margin: 0px;
  }
</style>
