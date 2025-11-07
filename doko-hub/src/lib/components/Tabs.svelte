<script lang="ts">
import Tab, { Label } from '@smui/tab';
import TabBar from '@smui/tab-bar';
//import { createEventDispatcher } from 'svelte';
  
  
  // Schnittstelle: Tabs und aktiver Tab können von außen 
  export let tabs: string[] = ['Spiele', 'Statistiken', 'Spieler'];
  export let active: string = tabs[0];
</script>

<TabBar {tabs} bind:active>
  {#snippet tab(tab)}
    <Tab {tab}>
      <Label>{tab}</Label>
    </Tab>
  {/snippet}
</TabBar>

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

// --- Tab-Leiste ---
:global(.smui-tab-bar) {
  width: 100%;
  background-color: theme.$surface;
  color: theme.$on-surface;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-bottom: 1px solid color.scale(theme.$surface, $lightness: -15%);
  display: flex;
  justify-content: center;
}

// --- Einzelne Tabs ---
:global(.smui-tab) {
  min-width: 100px;
  padding: 0 12px;
  color: theme.$on-surface;
  text-transform: none;
  font-weight: 500;
  transition: color 0.2s, background-color 0.2s;

  &:hover {
    background-color: color.scale(theme.$surface, $lightness: -5%);
  }
}

// --- Aktiver Tab (global kombiniert) ---
:global(.smui-tab.mdc-tab--active) {
  color: theme.$primary;
}

// --- Aktiv-Indikator ---
:global(.smui-tab.mdc-tab--active .mdc-tab__indicator) {
  background-color: theme.$primary;
  height: 3px;
  border-radius: 2px;
}

// --- Label Tabs ---
:global(.smui-tab__text-label) {
  font-size: 16px;
  padding: 12px 0;
}
</style>