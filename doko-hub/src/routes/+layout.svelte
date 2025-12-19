<!--TODO: Check for login
	1. Send request to backend to get player id
	2. If that fails, redirect to login page
	3. Else, render requested page
-->
<script lang="ts">
  let { children } = $props();
</script>

{@render children?.()}

<style>
  :global(body) {
    margin: 0px;
  }
</style>
