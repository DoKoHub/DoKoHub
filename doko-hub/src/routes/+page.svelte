<script lang="ts">
  import { goto } from "$app/navigation";
  import { StaticRoute } from "$lib/frontend/routes";
  import { onMount } from "svelte";

  onMount(() => {
    //TODO: check if player is logged in
    goto(StaticRoute.LOGIN);
  });
</script>
