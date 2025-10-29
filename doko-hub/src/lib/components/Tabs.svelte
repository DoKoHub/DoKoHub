<script lang="ts">
  export let tabs: string[] = ["Spiele", "Statistiken", "Spieler"]; 
  export let activeTab: string = tabs[0]; // Standard: erster Tab aktiv
  export let onSelectTab: (tab: string) => void = (tab) =>
    console.log(`Tab ausgewählt: ${tab}`);

  /** interner Handler */
  function handleSelect(tab: string) {
    activeTab = tab;
    onSelectTab(tab);
  }
</script>

<!--Tabs-->
<nav class="tab-bar">
  {#each tabs as tab}
    <button
      class="tab {activeTab === tab ? 'active' : ''}"
      on:click={() => handleSelect(tab)}
    >
      {tab}
    </button>
  {/each}
</nav>


<div class="divider"></div>

<style lang="scss">
@use 'sass:color';
@use '@material/theme/color-palette';
@use '@material/theme/index' as theme with (
  $primary: #955cff,
  $secondary: #676778,
  $surface: #ffffff,
  $background: #ffffff,
  $error: color-palette.$red-900
);

/* Tab */
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

  &:hover {
    background-color: color.scale(theme.$surface, $lightness: -10%);
  }
}


.divider {
  width: 100%;
  height: 1px;
  background-color: color.scale(theme.$on-surface, $lightness: 70%);
}
</style>