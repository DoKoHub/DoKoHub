<script lang="ts">
  import AppBar from '$lib/components/AppBar.svelte';
  import Tabs from '$lib/components/Tabs.svelte';

  function getGroupName(): string {
    // Dummy Daten
    return "Die Chaoten";
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
  function goBack() { console.log("Zurück-Button gedrückt"); }
  function openGroupSelector() { console.log("Gruppen-Auswahl öffnen"); }

  const groupName = getGroupName();
</script>

<AppBar 
  groupName={groupName} 
  onBack={goBack} 
  onSelectGroup={openGroupSelector}
/>

<Tabs {tabs} bind:active={activeTab}/>
