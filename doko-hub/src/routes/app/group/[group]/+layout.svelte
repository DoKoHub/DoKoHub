<script lang="ts">
  import AppBar from "$lib/components/AppBar.svelte";
  import Tabs from "$lib/components/Tabs.svelte";

  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";

  // Tabs
  const tabs = ["Spiele", "Statistiken", "Spieler"];

  let groupName = "";

  $: groupId = $page.params.group;

  // Aktiven Tab aus der URL bestimmen
  $: active = $page.url.pathname.includes("/games")
    ? "Spiele"
    : $page.url.pathname.includes("/stats")
      ? "Statistiken"
      : $page.url.pathname.includes("/members")
        ? "Spieler"
        : "Spiele";

  // Navigation bei Tab-Wechsel
  function handleTabChange(tab: string) {
    if (tab === "Spiele") goto(`/app/group/${groupId}/games`);
    if (tab === "Statistiken") goto(`/app/group/${groupId}/stats`);
    if (tab === "Spieler") goto(`/app/group/${groupId}/members`);
  }

  // Gruppennamen dynamisch laden
  onMount(async () => {
    const resGroup = await fetch(`/api/group/${groupId}`);
    if (!resGroup.ok) return;

    const group = await resGroup.json();
    groupName = group.name;
  });
</script>

<AppBar {groupName} />

<Tabs {tabs} {active} on:change={(e) => handleTabChange(e.detail)} />

<!-- slot = Platzhalter für Unterseiten stats, .... -->
<slot />
