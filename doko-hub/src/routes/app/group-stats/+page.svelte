<script lang="ts">
  /* === TypeScript Logik === */
  const groupName = "Die Chaoten"; // vorläufig fester String / dummy 
  let activeTab = "Statistiken";

  const tabs = ["Spiele", "Statistiken", "Spieler"];

  function selectTab(tab: string) {
    activeTab = tab;
  }

  function goBack() {
    console.log("Zurück-Button gedrückt"); // später: Navigation einbauen
  }

  function openGroupSelector() {
    console.log("Gruppen-Auswahl öffnen"); // Dummy Aktion
  }
</script>

<!-- === App Bar / Kopfzeile === -->
<header class="app-bar">
  <button class="leading-icon" on:click={goBack}>⬅</button> <!--leader icon-->

  <button class="group-button" on:click={openGroupSelector}> <!--tex icon Gruppenname-->
    <span class="group-name">{groupName}</span>
  </button>
</header>

<!-- === Tabs === -->
<nav class="tab-bar"> <!-- html Lösung -->
  {#each tabs as tab} <!-- vorläufiger Gruppen anzeigen, aktiver tab dann dummy Daten anzeigen -->
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

<style lang="scss">
/* === Material Theme Setup === */
@use 'sass:color';
@use '@material/theme/color-palette';
@use '@material/theme/index' as theme with (
  $primary: #ff3e00,
  $secondary: #676778,
  $surface: #ffffff,
  $background: #ffffff,
  $error: color-palette.$red-900
);

/* === Grundfarben & Text === */
html,
body {
  background-color: theme.$surface;
  color: theme.$on-surface;
  font-family: 'Roboto', sans-serif;
}

/* === App Bar === */
.app-bar {
  width: 412px;
  height: 64px;
  display: flex;
  align-items: center; /* vertikale Ausrichtung */
  gap: 8px;    /* Abstand */
  padding: 8px 12px; /* Innenabstand */
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

  &:hover { /* Pseudoklasse, aktiv, wenn Maus über Element fährt. */
    background-color: color.scale(theme.$surface, $lightness: -10%);
  }
}

/* === Gruppenname-Button (Kapsel) === */
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

/* === Text im Kapsel-Button === */
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
</style>
