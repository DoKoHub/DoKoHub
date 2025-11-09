<script lang="ts">
  import AppBar from "$lib/components/AppBar.svelte";
  import Tabs from "$lib/components/Tabs.svelte";
  import PlusButton from "$lib/components/PlusButton.svelte";

  import List, {
    Item,
    PrimaryText,
    Graphic,
    Meta,
    Separator,
  } from "@smui/list";

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
    openAddDialog(); // Dialog öffnen
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
    // NEU: Edit-Dialog sicher schließen
    editOpen = false;
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

  // === Edit-Dialog: State ===
  let editOpen = $state(false);
  let editIndex = $state<number | null>(null);
  let editName = $state("");

  // Beim Klick auf einen Spieler öffnen (i = Index in playerList)
  function openEdit(i: number) {
    // NEU: Add-Dialog sicher schließen
    addOpen = false;
    editIndex = i;
    editName = playerList[i];
    editOpen = true;
  }

  function cancelEdit() {
    editOpen = false;
    editName = "";
    editIndex = null;
  }

  function confirmEdit() {
    const n = editName.trim();
    if (!n || editIndex === null) return;
    // Namen im Array ersetzen
    playerList = playerList.map((p, idx) => (idx === editIndex ? n : p));
    editOpen = false;
    editName = "";
    editIndex = null;
  }
</script>

<AppBar {groupName} onBack={goBack} onSelectGroup={openGroupSelector} />

<Tabs {tabs} bind:active={activeTab} />

<PlusButton {addSomething} />

<!-- Beispiel Inhalt -->
<main class="main-content">
  {#if activeTab === "Spieler"}
    <List class="player-list">
      {#each playerList as player, i}
        <Item
          class="player-item-row"
          tabindex={0}
          role="button"
          onclick={() => openEdit(i)}
          onkeydown={(e: KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") openEdit(i);
          }}
        >
          <Graphic class="material-icons">groups</Graphic>
          <PrimaryText>{player}</PrimaryText>
          <Meta class="material-icons" aria-hidden="true">edit</Meta>
        </Item>
        <Separator />
      {/each}
    </List>
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

<!-- Dialog_Edit_Player -->
<Dialog
  bind:open={editOpen}
  class="edit-player-dialog"
  aria-labelledby="ep-title"
  aria-describedby="ep-desc"
>
  <DialogTitle id="ep-title">Spieler bearbeiten</DialogTitle>

  <DialogContent>
    <p id="ep-desc" class="hint">Gib den Namen des Spielers ein.</p>

    <Textfield
      label="Name"
      variant="filled"
      class="w-full has-x"
      bind:value={editName}
      withTrailingIcon
    >
      {#snippet trailingIcon()}
        <Icon
          class="material-icons tf-x"
          role="button"
          onclick={() => (editName = "")}
          aria-label="Eingabe löschen"
        >
          close
        </Icon>
      {/snippet}
    </Textfield>
  </DialogContent>

  <DialogActions class="dlg-actions-right">
    <Button onclick={cancelEdit}><Label>Abbrechen</Label></Button>
    <Button onclick={confirmEdit} disabled={!editName.trim()}>
      <Label>Ok</Label>
    </Button>
  </DialogActions>
</Dialog>

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

  /* === Dialog_New_Person – Figma-Styling === */

  /* Grundfläche des Dialogs */
  :global(.new-person-dialog .mdc-dialog__surface) {
    border-radius: 24px;
    background: #f4eef9;
    color: #1b1b1f;
    width: 332px;
    max-width: calc(100vw - 32px);
  }

  /* Inhalt (Abstände & Spaltenlayout) */
  :global(.new-person-dialog .mdc-dialog__content) {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding-top: 4px;
  }

  /* Hinweistext */
  .hint {
    margin: 0 0 8px;
    color: #5f5f66;
    line-height: 1.4;
  }

  /* Eingabefeld hell mit violetter Linie */
  :global(.new-person-dialog .mdc-text-field--filled) {
    background: #efe8f5;
  }

  :global(.new-person-dialog .mdc-text-field--filled .mdc-line-ripple) {
    background-color: #6750a4;
  }

  /* kleines dunkles X (Eingabe löschen) */
  :global(.new-person-dialog .material-icons.tf-x) {
    font-size: 18px;
    color: #333;
    margin-right: 8px;
  }

  /* Aktionen unten rechts */
  :global(.new-person-dialog .mdc-dialog__actions) {
    justify-content: flex-end;
    gap: 20px;
  }

  /* Farbthema Lila */
  :global(.new-person-dialog) {
    --mdc-theme-primary: #6750a4;
  }

  /* OK-Button aktiv = Lila */
  :global(.new-person-dialog .mdc-button:not(:disabled) .mdc-button__label) {
    color: #6750a4 !important;
  }

  /* OK-Button deaktiviert = hell-lila */
  :global(.new-person-dialog .mdc-button:disabled .mdc-button__label) {
    color: #b9aee3 !important;
    opacity: 1;
  }

  /* === Dialog_Edit_Player – Figma-Styling === */

  /* Grundfläche */
  :global(.edit-player-dialog .mdc-dialog__surface) {
    border-radius: 24px;
    background: #f4eef9;
    color: #1b1b1f;
    width: 332px;
    max-width: calc(100vw - 32px);
  }

  /* Inhalt */
  :global(.edit-player-dialog .mdc-dialog__content) {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding-top: 4px;
  }

  /* Hinweistext */
  .hint {
    margin: 0 0 8px;
    color: #5f5f66;
    line-height: 1.4;
  }

  /* Eingabefeld hell + Akzentlinie */
  :global(.edit-player-dialog .mdc-text-field--filled) {
    background: #efe8f5;
  }

  :global(.edit-player-dialog .mdc-text-field--filled .mdc-line-ripple) {
    background-color: #6750a4;
  }

  /* kleines dunkles X */
  :global(.edit-player-dialog .material-icons.tf-x) {
    font-size: 18px;
    color: #333;
    margin-right: 8px;
  }

  /* Aktionen unten rechts */
  :global(.dlg-actions-right .mdc-dialog__actions),
  :global(.edit-player-dialog .mdc-dialog__actions) {
    justify-content: flex-end;
    gap: 20px;
  }

  /* Primärfarbe (Buttons) */
  :global(.edit-player-dialog) {
    --mdc-theme-primary: #6750a4;
  }

  /* OK-Button aktiv */
  :global(.edit-player-dialog .mdc-button:not(:disabled) .mdc-button__label) {
    color: #6750a4;
  }

  /* OK-Button deaktiviert */
  :global(.edit-player-dialog .mdc-button:disabled .mdc-button__label) {
    color: #b9aee3;
    opacity: 1;
  }

  /* hinzufügen */
  :global(.player-item-row:hover) {
    background: rgba(0, 0, 0, 0.04);
  }

  :global(.player-item-row:focus-visible) {
    outline: 3px solid #6750a4;
    border-radius: 12px;
  }
</style>
