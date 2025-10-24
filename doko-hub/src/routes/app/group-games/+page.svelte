<!-- === Logik (TypeScript) === -->
<script lang="ts">
  const groupName = "Die Chaoten";
  let activeTab = "Spiele";

  const tabs = ["Spiele", "Statistiken", "Spieler"];

  // Dummy-Daten für Spiele
  const gameList = [
    { date: "01.06.2025", status: "Aktives Spiel", note: "Spiel muss noch beendet werden" },
    { date: "14.05.2025", winner: "Marcel" },
    { date: "05.05.2025", winner: "Fabian" }
  ];

  function selectTab(tab: string) {
    activeTab = tab;
  }

  function goBack() {
    console.log("Zurück-Button gedrückt");
  }

  function openGroupSelector() {
    console.log("Gruppen-Auswahl öffnen");
  }

  function addSomething() {
    console.log("Neues Spiel hinzufügen");
  }
</script>

<!-- === Kopfzeile === -->
<header class="app-bar">
  <button class="leading-icon" on:click={goBack}>⬅</button>

  <button class="group-button" on:click={openGroupSelector}>
    <span class="group-name">{groupName}</span>
  </button>
</header>

<!-- === Tabs === -->
<nav class="tab-bar">
  {#each tabs as tab}
    <button
      class="tab {activeTab === tab ? 'active' : ''}"
      on:click={() => selectTab(tab)}
    >
      {tab}
    </button>
  {/each}
</nav>

<!-- === Divider === -->
<div class="divider"></div>

<!-- === Spiele-Liste, Dummy Aktion === -->
<main class="main-content">
  {#if activeTab === "Spiele"}
    <ul class="game-list">
      {#each gameList as game}
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

<!-- === Plus Button === -->
<button class="fab" on:click={addSomething}>+</button>

<style lang="scss">
@use 'sass:color';
@use '@material/theme/color-palette';
@use '@material/theme/index' as theme with (
  $primary: #ff3e00,
  $secondary: #676778,
  $surface: #ffffff,
  $background: #ffffff,
  $error: color-palette.$red-900
);

/* === Grundstruktur === */
html,
body {
  background-color: theme.$surface;
  color: theme.$on-surface;
  font-family: 'Roboto', sans-serif;
  margin: 0;
}

/* === App Bar === */
.app-bar {
  width: 412px;
  height: 64px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background-color: theme.$surface;
  color: theme.$on-surface;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

/* === Zurück-Button === */
.leading-icon {
  width: 48px;
  height: 48px;
  border: none;
  border-radius: 50%;
  background-color: theme.$surface;
  font-size: 22px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;

  &:hover {
    background-color: color.scale(theme.$surface, $lightness: -10%);
  }
}

/* === Gruppenname-Button === */
.group-button {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: theme.$surface;
  border: none;
  border-radius: 30px;
  padding: 6px 16px;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: color.scale(theme.$surface, $lightness: -10%);
  }
}

.group-name {
  font-weight: 400;
  font-size: 18px;
  color: theme.$on-surface;
}

/* === Tabs === */
.tab-bar {
  display: flex;
  justify-content: space-around;
  align-items: center;
  height: 64px;
  width: 100%;
  background-color: theme.$surface;
}

.tab {
  flex: 1;
  background: none;
  border: none;
  height: 100%;
  font-size: 16px;
  color: theme.$on-surface;
  cursor: pointer;
  transition: color 0.2s, border-bottom 0.2s;

  &.active {
    color: theme.$primary;
    border-bottom: 2px solid theme.$primary;
    font-weight: 600;
  }
}

/* === Divider === */
.divider {
  width: 100%;
  height: 1px;
  background-color: color.scale(theme.$on-surface, $lightness: 70%);
}

/* === Spiele-Liste === */
.game-list {
  list-style: none;
  padding: 16px;
  margin: 0;
}

.game-list li {
  background-color: theme.$surface;
  margin-bottom: 8px;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 16px;
  color: theme.$on-surface;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
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

