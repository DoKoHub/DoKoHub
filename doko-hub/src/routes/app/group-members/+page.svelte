<script lang="ts">
  import AppBar from "$lib/components/AppBar.svelte";
  import Tabs from "$lib/components/Tabs.svelte";

  // === Dummy Daten / Funktionen ===
  function getGroupName(): string {
    return "Die Chaoten";
  }

  function getPlayerList(): string[] {
    return ["Marcel", "Fabian", "Maurice", "Nick"];
  }

  function goBack() {
    console.log("Zurück-Button gedrückt");
  }
  function openGroupSelector() {
    console.log("Gruppen-Auswahl öffnen");
  }
  function addSomething() {
    console.log("Plus-Button gedrückt");
  }

  const groupName = getGroupName();
  //let playerList = getPlayerList();
  let playerList: string[] = $state(getPlayerList());

  const tabs = ["Spiele", "Statistiken", "Spieler"];
  //let activeTab = "Spieler";
  let activeTab = $state("Spieler");

  function handleSelectTab(tab: string) {
    activeTab = tab;
    console.log("Tab gewechselt zu:", tab);
  }

  // SMUI für den Dialog (falls noch nicht importiert) L
  import Dialog, {
    Title as DialogTitle,
    Content as DialogContent,
    Actions as DialogActions,
  } from "@smui/dialog";
  import Button, { Label } from "@smui/button";
  import Textfield from "@smui/textfield";
  import Icon from "@smui/textfield/icon";

  // State & Handler für „Spieler hinzufügen“
  let addOpen = $state(false);
  let newName = $state("");

  function openAddDialog() {
    newName = "";
    addOpen = true;
  }
  function cancelAdd() {
    addOpen = false;
    newName = "";
  }
  function confirmAdd() {
    const n = newName.trim();
    if (!n) return;
    // Spieler zur Liste hinzufügen (Dummy – später API/Store)
    playerList = [...playerList, n];
    addOpen = false;
  }
</script>

<AppBar {groupName} onBack={goBack} onSelectGroup={openGroupSelector} />

<Tabs {tabs} {activeTab} onSelectTab={handleSelectTab} />

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

<!-- Dialog_New_Person -->
<Dialog
  bind:open={addOpen}
  class="new-person-dialog"
  aria-labelledby="np-title"
  aria-describedby="np-desc"
>
  <DialogTitle id="np-title">Spieler hinzufügen</DialogTitle>

  <DialogContent>
    <p id="np-desc" class="hint">Gib den Namen des neuen Spielers ein.</p>

    <Textfield
      label="Name"
      variant="filled"
      class="w-full has-x"
      bind:value={newName}
      withTrailingIcon
    >
      {#snippet trailingIcon()}
        <Icon
          class="material-icons tf-x"
          role="button"
          onclick={() => (newName = "")}
        >
          close
        </Icon>
      {/snippet}
    </Textfield>
  </DialogContent>

  <DialogActions class="dlg-actions-right">
    <Button onclick={cancelAdd}>
      <Label>Abbrechen</Label>
    </Button>
    <!-- disabled={!newName.trim()}> -->
    <Button onclick={confirmAdd}>
      <Label>Ok</Label>
    </Button>
  </DialogActions>
</Dialog>

<!-- === Plus Button === -->
<button class="fab" onclick={openAddDialog}>+</button>

<style lang="scss">
  @use "sass:color";
  @use "@material/theme/color-palette";
  @use "@material/theme/index" as theme with (
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
    transition:
      background-color 0.2s,
      transform 0.1s;

    &:hover {
      background-color: color.scale(theme.$primary, $lightness: -10%);
    }

    &:active {
      transform: scale(0.96);
    }
  }

  .fab:hover {
    background-color: #7c5ce2;
  }

  /* === Dialog_New_Group – Figma-Styling === */

  /* Grundfläche des Dialogs */
  :global(.new-group-dialog .mdc-dialog__surface) {
    border-radius: 24px;
    background: #f4eef9;
    color: #1b1b1f;
  }

  /* Buttons unten rechts */
  :global(.new-group-dialog .mdc-dialog__actions) {
    justify-content: flex-end;
    gap: 20px;
  }

  /* Eingabefeld hellgrau + volle Breite */
  :global(.new-group-dialog .mdc-text-field--filled) {
    background: #e0e0e0; /* hellgrauer Hintergrund wie im Screenshot */
    width: 100%;
    max-width: none;
    margin: 0;
  }

  /* Lila Linie unten (statt orange) */
  :global(.new-group-dialog .mdc-text-field--filled .mdc-line-ripple) {
    background-color: #6750a4;
  }

  /* Kleinere, dunkle X-Icon-Farbe */
  :global(.new-group-dialog .material-icons.tf-x) {
    font-size: 18px;
    color: #333333; /* dunkles Grau/fast Schwarz */
    margin-right: 8px;
  }

  /* Lila Theme-Farbe für aktive Buttons */
  :global(.new-group-dialog .mdc-button) {
    --mdc-theme-primary: #6750a4;
  }

  /* OK-Button aktiv = Lila */
  :global(.new-group-dialog .mdc-button:not(:disabled) .mdc-button__label) {
    color: #6750a4 !important;
  }

  /* OK-Button deaktiviert = hell-lila */
  :global(.new-group-dialog .mdc-button:disabled .mdc-button__label) {
    color: #b9aee3 !important;
    opacity: 1;
  }
</style>
