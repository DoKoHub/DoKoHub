<script lang="ts">
  import AppBar from "$lib/components/AppBar.svelte";
  import Tabs from "$lib/components/Tabs.svelte";
  import PlusButton from "$lib/components/PlusButton.svelte";

  import Dialog, {
    Title as DialogTitle,
    Content as DialogContent,
    Actions as DialogActions,
  } from "@smui/dialog";
  import Button, { Label } from "@smui/button";
  import Switch from "@smui/switch";
  import IconButton from "@smui/icon-button";
  import { mdiRefresh } from "@mdi/js"; // refresh Symbol

  import { onMount } from "svelte"; // Code automatisch ausführen, wenn Seite / Komp. geladen werden
  import { page } from "$app/stores"; // Infos aktueller Seite

  // false, erstmal nicht anzeigen
  let newGameOpen = false;

  /* Dummy Daten / Funktionen
  function getGroupName(): string {
    return "Die Chaoten";
  }

  function getGameList() {
    return [
      {
        date: "01.06.2025",
        status: "Aktives Spiel",
        note: "Spiel muss noch beendet werden",
      },
      { date: "14.05.2025", winner: "Marcel" },
      { date: "05.05.2025", winner: "Fabian" },
    ];
  }

  const groupName = getGroupName();
  let gameList = getGameList(); */

  // ersetzen durch

  // Dynamische Daten vom Backend
  let groupName = "";
  let gameList: any[] = [];
  let loading = true;
  let error = "";

  // fetch() Logik um Spiele, Gruppennamen dyn. vom backend zu holen

  onMount(async () => {
    try {
      const groupId = $page.params.group as string; // const = fest

      // Gruppe abrufen
      const resGroup = await fetch(`/api/group/${groupId}`); // Anfrage Gruppe an server
      if (!resGroup.ok) throw new Error("Fehler beim Abrufen der Gruppendaten"); // wenn keine Daten da sind
      const group = await resGroup.json(); // Serverantwort in JavaScript-Objekt

      // Daten übernehmen
      groupName = group.name; // Name für frontend speichern
      gameList = group.games ?? []; // falls Spiele im Gruppenobj enthalten sind speichern, sonst leeres Array
    } catch (err: any) {
      // any für jeden Datentyp
      error = err.message;
    } finally {
      loading = false;
    }
  });

  function goBack() {
    console.log("Zurück-Button gedrückt");
  }
  function openGroupSelector() {
    console.log("Gruppen-Auswahl öffnen");
  }

  function addSomething() {
    console.log("Neues Spiel hinzufügen");
    newGameOpen = true; // Dialog anzeigen
  }

  const tabs = ["Spiele", "Statistiken", "Spieler"];
  let activeTab = "Spiele";
</script>

<AppBar {groupName} onBack={goBack} onSelectGroup={openGroupSelector} />

<Tabs {tabs} bind:active={activeTab} />

<!-- Beispiel Ihhalt 
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
-->

<!-- dynamischer Inhalt-->
<main class="main-content">
  {#if loading}
    <p>Lade Spieldaten ...</p>
  {:else if error}
    <!-- Fehler / keine Daten  -->
    <p style="color:red">{error}</p>
    <!-- wenn tab = Spiele ist -->
  {:else if activeTab === "Spiele"}
    <ul class="game-list">
      <!-- Spielliste aus dyn. Array erstellen -->
      {#each gameList as game}
        <!-- Listenpunkt -->
        <li>
          <strong>{game.date}</strong>
          {#if game.status}
            <div>{game.status}</div>
            <small>{game.note}</small>
          {:else}
            <div>Sieger: {game.winner ?? "offen"}</div>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</main>

<PlusButton {addSomething} />

<!-- Neues Spiel starten mit Dialog, newGameOpen = true -->
<Dialog
  bind:open={newGameOpen}
  class="new-game-dialog"
  aria-labelledby="ng-title"
  aria-describedby="ng-desc"
>
  <DialogTitle id="ng-title">Neues Spiel starten</DialogTitle>

  <DialogContent>
    <p id="ng-desc" class="hint">
      Wählen Sie ob Sie mit oder ohne Pflichtsolos spielen möchten. Anschließend
      können Sie die vorgegebene Sitzreihenfolge anpassen.
    </p>

    <!-- Mit Pflichtsolos -->
    <div class="switch-row">
      <span>Mit Pflichtsolos</span>
      <Switch checked />
    </div>

    <!-- Spielrunden -->
    <div class="section">
      <label class="section-label">Spielrunden</label>
      <div class="round-buttons">
        {#each [8, 12, 16, 20, 24] as rounds}
          <Button variant="outlined" class="round-btn">
            <Label>{rounds}</Label>
          </Button>
        {/each}
      </div>
    </div>

    <!-- Sitzreihenfolge -->
    <div class="section">
      <div class="row-header">
        <label class="section-label">Sitzreihenfolge</label>
        <IconButton class="refresh-btn" title="Zufällige Reihenfolge">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d={mdiRefresh} />
          </svg>
        </IconButton>
      </div>

      <ul class="player-list">
        <li>Marcel</li>
        <li>Fabian</li>
        <li>Nick</li>
        <li>Maurice</li>
      </ul>
    </div></DialogContent
  >

  <DialogActions class="dlg-actions-right">
    <Button><Label>Abbrechen</Label></Button>
    <Button><Label>Start</Label></Button>
  </DialogActions>
</Dialog>

<style lang="scss">
  @use "sass:color";
  @use "@material/theme/color-palette";
  @use "@material/theme/index" as theme with (
    $primary: #ff3e00,
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
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .new-game-dialog {
    /* Grundfläche */
    :global(.mdc-dialog__surface) {
      border-radius: 24px;
      background: #f4eef9;
      color: #1b1b1f;
    }

    :global(.mdc-dialog__title) {
      font-weight: 600;
      margin-bottom: 8px;
    }

    /* Buttons unten */
    :global(.mdc-dialog__actions) {
      justify-content: flex-end;
      gap: 20px;
    }

    :global(.mdc-button .mdc-button__label) {
      color: #6750a4 !important;
    }
  }
</style>
