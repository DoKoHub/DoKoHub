<script lang="ts">
  //import AppBar from "$lib/components/AppBar.svelte";
  //import Tabs from "$lib/components/Tabs.svelte";
  import { onMount } from "svelte";
  import { page } from "$app/stores";

  /* function getGroupName(): string {
    // Dummy Daten
    return "Die Chaoten";
  } */
  let groupName = "";

  onMount(async () => {
    groupName = await getGroupName();
  });
  // async weil fetch() und join() async arbeiten
  async function getGroupName(): Promise<string> {
    try {
      const groupId = $page.params.group as string; // aktuelle Gruppen-ID aus der URL
      const resGroup = await fetch(`/api/group/${groupId}`);

      if (!resGroup.ok) {
        throw new Error("Fehler beim Laden der Gruppe");
      }

      const group = await resGroup.json();
      return group.name ?? "Unbekannte Gruppe"; // Rückgabe des echten Gruppennamens
    } catch (err: any) {
      console.error("Fehler beim Laden des Gruppennamens:", err);
      return "Fehler beim Laden";
    }
  }

  // Tabs Logik
  const tabs = ["Spiele", "Statistiken", "Spieler"];
  let activeTab = "Statistiken"; // Start-Tab

  function handleSelectTab(tab: string) {
    activeTab = tab;
    console.log("Tab gewechselt zu:", tab);
    // später für Navigation
  }

  // Dummy Aktionen für AppBar
  function goBack() {
    console.log("Zurück-Button gedrückt");
  }
  function openGroupSelector() {
    console.log("Gruppen-Auswahl öffnen");
  }

  //const groupName = getGroupName();
</script>

<!--
<AppBar {groupName} onBack={goBack} onSelectGroup={openGroupSelector} />

<Tabs {tabs} bind:active={activeTab} />
-->
