<script lang="ts">
  import AppBar from '$lib/components/AppBar.svelte';
  import Tabs from '$lib/components/Tabs.svelte';

  // Dummy Daten / Funktionen 
  function getGroupName(): string {
    return "Die Chaoten";
  }

  function getGameList() {
    return [
      { date: "01.06.2025", status: "Aktives Spiel", note: "Spiel muss noch beendet werden" },
      { date: "14.05.2025", winner: "Marcel" },
      { date: "05.05.2025", winner: "Fabian" }
    ];
  }

  function goBack() { console.log("Zurück-Button gedrückt"); }
  function openGroupSelector() { console.log("Gruppen-Auswahl öffnen"); }
  function addSomething() { console.log("Neues Spiel hinzufügen"); }

  
  const groupName = getGroupName();
  let gameList = getGameList();

  const tabs = ["Spiele", "Statistiken", "Spieler"];
  let activeTab = "Spiele";

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

<!-- Beispiel Ihhalt -->
<main class="main-content">
  {#if activeTab === "Spiele"}
    <ul class="game-list">
      {#each gameList as game} <!-- aus Array Element in html unwandeln-->
        <li>
          <strong>{game.date}</strong>
          {#if game.status}
            <div>{game.status}</div>
            <small>{game.note}</small>
          {:else}
            <div>Sieger: {game.winner}</div>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</main>

<!-- Plus Button -->
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
.game-list {
  list-style: none;
  padding: 16px;
  margin: 0;
}

.game-list li {
  background-color: #fff; /* theme.$surface */
  margin-bottom: 8px;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 16px;
  color: #000; /* theme.$on-surface */
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
  background-color: #955cff,; /* theme.$primary */
  color: #fff; /* theme.$on-primary */
  font-size: 28px;
  font-weight: 400;
  cursor: pointer;
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s, transform 0.1s;

  &:hover {
    background-color: color.scale(theme.$primary, $lightness: -10%); /* leicht dunkler */
  }

  &:active {
    transform: scale(0.96);
  }
}
</style>


