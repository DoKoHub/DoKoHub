<script lang="ts">
  import { goto } from "$app/navigation";
  import { StaticRoute } from "$lib/frontend/routes";
  import { onMount } from "svelte";

  onMount(() => {
    //TODO: check if player is logged in
    //FIXME: this is only while the actual login page is unfinished!
    goto(StaticRoute.FIRST_TIME_LOGIN);
  });
</script>
