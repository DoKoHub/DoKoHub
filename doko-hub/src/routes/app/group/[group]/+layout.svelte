<script lang="ts">
  import AppBar from "$lib/components/AppBar.svelte";
  import Tabs from "$lib/components/Tabs.svelte";
  import { onMount } from "svelte";
  import { get } from "$lib/frontend/fetch";
  import { PlayGroup, UUID } from "$lib/types";
  import type { LayoutProps } from "./$types";
  import { goto } from "$app/navigation";

  type Data =
    | { tag: "loading" }
    | {
        tag: "loaded";
        group_name: string;
      }
    | {
        tag: "error";
        error: string;
      };
  type Tab = "games" | "stats" | "members";

  const { children, params }: LayoutProps = $props();
  const groupId = UUID.parse(params.group);
  const tabs: Tab[] = ["games", "stats", "members"];

  let page_data: Data = $state({ tag: "loading" });
  let active: Tab = $state("games");

  // Navigation bei Tab-Wechsel
  function handleTabChange(tab: Tab) {
    if (tab === "games") goto(`/app/group/${groupId}/games`);
    if (tab === "stats") goto(`/app/group/${groupId}/stats`);
    if (tab === "members") goto(`/app/group/${groupId}/members`);
  }

  function goBack() {
    console.log("Zurück-Button gedrückt");
  }
  function openGroupSelector() {
    console.log("Gruppen-Auswahl öffnen");
  }

  onMount(async () => {
    try {
      const group = await get(`/api/group/${groupId}`, PlayGroup);

      // Daten übernehmen
      page_data = {
        tag: "loaded",
        group_name: group.name,
      };
    } catch (err: any) {
      // any für jeden Datentyp
      page_data = {
        tag: "error",
        error: err.message,
      };
    }
  });
</script>

<div class="app-container">
  {#if page_data.tag === "loading"}
    Loading...
  {:else if page_data.tag === "loaded"}
    <AppBar
      groupName={page_data.group_name}
      onBack={goBack}
      onSelectGroup={openGroupSelector}
    />
    <div class="app-main">
      <Tabs {tabs} {active} on:change={(e) => handleTabChange(e.detail)} />
      {@render children?.()}
    </div>
  {:else}
    Error: {page_data.error}
  {/if}
</div>

<style>
  :global(body) {
    margin: 0;
    width: 100vw;
  }

  .app-container {
    width: 100%;
    display: flex;
    flex-wrap: wrap;
  }

  .app-main {
    margin-top: 64px; /*HACK: The app bar is 64px tall and position:fixed so we need to move the same down so we don't intersect it*/
    width: 100%;
  }
</style>
