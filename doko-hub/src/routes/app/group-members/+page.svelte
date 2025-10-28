<script lang="ts">
  import AppBar from '$lib/components/AppBar.svelte';
  import Tabs from '$lib/components/Tabs.svelte';

  // === Dummy Daten / Funktionen ===
  function getGroupName(): string {
    return "Die Chaoten";
  }

  function getPlayerList(): string[] {
    return ["Marcel", "Fabian", "Maurice", "Nick"];
  }

  function goBack() { console.log("Zurück-Button gedrückt"); }
  function openGroupSelector() { console.log("Gruppen-Auswahl öffnen"); }
  function addSomething() { console.log("Plus-Button gedrückt"); }

  
  const groupName = getGroupName();
  let playerList = getPlayerList();

  const tabs = ["Spiele", "Statistiken", "Spieler"];
  let activeTab = "Spieler";

  function handleSelectTab(tab: string) {
    activeTab = tab;
    console.log("Tab gewechselt zu:", tab);
  }
</script>


<AppBar
  {groupName}
  onBack={goBack}
  onSelectGroup={openGroupSelector}
/>


<Tabs
  {tabs}
  {activeTab}
  onSelectTab={handleSelectTab}
/>

<!-- Beispiel Inhalt -->
<main class="main-content">
  {#if activeTab === "Spieler"}
    <ul class="player-list">
      {#each playerList as player}
        <li>{player}</li>
      {/each}
    </ul>
  {/if}
</main>

<!-- === Plus Button === -->
<button class="fab" on:click={addSomething}>+</button>

<style lang="scss">
@use 'sass:color';
@use '@material/theme/color-palette';
@use '@material/theme/index' as theme with (
  $primary: #955cff,
  $secondary: #676778,
  $surface: #fff,
  $background: #fff,
  $error: color-palette.$red-900
);

.player-list {
  list-style: none;
  padding: 16px;
  margin: 0;
}

.player-list li {
  background-color: theme.$surface;
  margin-bottom: 8px;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 16px;
  color: theme.$on-surface;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

/* === Plus Button === */
.fab {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background-color: theme.$primary;
  color: theme.$on-primary;
  font-size: 28px;
  font-weight: 400;
  cursor: pointer;
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s, transform 0.1s;

  &:hover {
    background-color: color.scale(theme.$primary, $lightness: -10%);
  }

  &:active {
    transform: scale(0.96);
  }
}
</style>

