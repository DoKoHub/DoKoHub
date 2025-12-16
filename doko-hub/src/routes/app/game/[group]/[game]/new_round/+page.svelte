<!--FIXME: Clanker code >:(
  Der Code unten muss großflächig überarbeitet werden.
  Am besten wird er neu geschrieben.

  Vorschläge:
  1. Dialoge in eigene Komponenten rausziehen!!!
  2. DTOs anpassen!!!!
  3. Keine Silliness mit HTML+CSS sondern SMUI dafür nutzen wofür es gemacht wurde >:(
-->
<script lang="ts">
  import Button, { Label } from "@smui/button";
  import IconButton from "@smui/icon-button";
  import Textfield from "@smui/textfield";
  import Icon from "@smui/textfield/icon";
  import Dialog, {
    Title as DialogTitle,
    Content as DialogContent,
    Actions as DialogActions,
  } from "@smui/dialog";
  import { goto } from "$app/navigation";
  import type { PageProps } from "./$types";

  import {
    BonusType,
    CallType,
    type GameType,
    Round,
    type Side,
    SoloKind,
    UUID,
  } from "$lib/types";
  import { post } from "$lib/frontend/fetch";
  import z from "zod";

  // ================== Typen ==================

  interface Player {
    id: UUID;
    name: string;
    side: Side | null;

    specialSummary: Record<BonusType, number>;
    announcementSummary: Set<CallType>;
  }

  // ================== Zustand ==================

  const { data }: PageProps = $props();

  //svelte-ignore state_referenced_locally only fetched once on page load, so copying is fine here
  const { session, next_round_number } = data;
  const gameId = session.id;
  const groupId = session.groupId;

  let gameType: GameType = $state("NORMAL");
  let soloIsCompulsory = $state(true); // true = Pflichtsolo, false = Lustsolo

  let winnerSide: Side = $state("RE"); // Partei, die (voraussichtlich) gewinnt
  let eyes = $state(42);

  let players: Player[] = $state(
    session.members.map(({ memberId, nickname }) => ({
      id: memberId,
      name: nickname!, //FIXME: the nickname is never null but the DTOs don't reflect that
      side: null,
      specialSummary: {
        DOKO: 0,
        FUCHS: 0,
        KARLCHEN: 0,
      },
      announcementSummary: new Set(),
    }))
  );

  // Welcher Spieler wird gerade im Dialog bearbeitet?
  let activePlayer: Player | null = $state(null);

  function isSolo(game_type: GameType) {
    return game_type.startsWith("SOLO_");
  }

  // ================== Navigation / AppBar ==================

  function goBack() {
    goto(`/app/game/${groupId}/${gameId}/overview/rounds`);
  }

  // ================== Spieler-Seite toggeln ==================

  function cyclePlayerSide(player: Player) {
    if (player.side === "RE") {
      player.side = "KONTRA";
    } else {
      player.side = "RE";
    }
  }

  // Extrapunkte-Dialog
  let extraDialogOpen = $state(false);

  function open_extra_dialog(player: Player) {
    activePlayer = player;
    extraDialogOpen = true;
  }

  function changeExtra(k: BonusType, delta: -1 | 1) {
    if (!activePlayer) return;

    activePlayer.specialSummary[k] = Math.max(
      0,
      activePlayer.specialSummary[k] + delta
    );
  }
  // ================== Ansagen-Dialog ==================

  let announcementDialogOpen = $state(false);

  function openAnnouncementDialog(player: Player) {
    activePlayer = player;
    announcementDialogOpen = true;
  }

  function toggleAnnouncementOption(opt: CallType) {
    const announcements = activePlayer!.announcementSummary;
    if (announcements.has(opt)) {
      announcements.delete(opt);
    } else {
      announcements.add(opt);
    }
  }

  function closeAnnouncementDialog() {
    announcementDialogOpen = false;
    activePlayer = null;
  }

  // ================== Speichern-Validierung ==================

  let saveErrorDialogOpen = $state(false);
  let saveErrors: string[] = $state([]);
  function collectSaveErrors(): string[] {
    //TODO: Diese """Regeln""" müssen doppelgeprüft werden, da AI-generiert >:(
    const errors: string[] = [];

    // 1️. Regel: Re-Partei muss genau 1 Spieler haben
    const rePlayers = players.filter((p) => p.side === "RE").length;
    if (rePlayers !== 1) {
      errors.push(
        `Derzeit sind ${rePlayers} Spieler in der Reh-Partei. Es muss jedoch genau 1 Spieler sein.`
      );
    }

    // 2️. Regel: K90 nur erlaubt, wenn Re oder Contra angesagt wurde
    const anyAnnouncement = players.some(
      (p) => p.announcementSummary.size !== 0
    );

    const reOrContraChosen = players.some(
      (p) => p.side === "RE" || p.side === "KONTRA"
    );

    if (anyAnnouncement && !reOrContraChosen) {
      errors.push(
        "Es wurde die Ansage K90 getätigt ohne das Reh/Contra angesagt wurde."
      );
    }

    // 3️. Regel: Max 2 Füchse erlaubt
    const foxCount = players.reduce((sum, p) => {
      return sum + p.specialSummary.FUCHS;
    }, 0);

    if (foxCount > 2) {
      errors.push(
        `Es wurden ${foxCount} Füchse gefangen. Maximal sind jedoch 2 möglich.`
      );
    }
    // Regel: Sonderpunkte sind nicht erlaubt bei stiller/unklarer Hochzeit
    if (gameType === "HOCHZEIT_STILL" || gameType === "HOCHZEIT_UNKNOWN") {
      const hasAnySpecialPoints = players.some(
        ({ specialSummary }) =>
          specialSummary.DOKO +
            specialSummary.FUCHS +
            specialSummary.KARLCHEN !==
          0
      );
      if (hasAnySpecialPoints) {
        errors.push(
          "Sonderpunkte gibt es nicht bei einer stillen Hochzeit und bei einer Hochzeit ohne Klärung."
        );
      }
    }

    return errors;
  }
  // ================== Speichern ==================

  async function saveRound() {
    //This silliness is required because of sveltes' deep reactive state. The objects inside the array are only lazily updated
    const players_ = $state.snapshot(players);

    //FIXME: the below should be a single API call to ensure data integrity!
    // Create new session

    let soloKind: SoloKind | null = null;
    if (isSolo(gameType)) {
      soloKind = soloIsCompulsory ? "PFLICHT" : "LUST";
    }

    let eyesRe = eyes;
    if (winnerSide === "KONTRA") {
      eyesRe = 240 - eyes;
    }

    const { round } = await post(
      `/api/group/${groupId}/session/${gameId}/round`,
      {
        roundNum: next_round_number,
        gameType,
        soloKind,
        eyesRe,
      },
      z.object({ message: z.string(), round: Round })
    );

    // Add members
    for (const player of players_) {
      await post(
        `/api/group/${groupId}/session/${gameId}/round/${round.id}/participation`,
        {
          memberId: player.id,
          side: player.side!,
        },
        z.any()
      );

      for (const call of player.announcementSummary) {
        await post(
          `/api/group/${groupId}/session/${gameId}/round/${round.id}/call`,
          {
            memberId: player.id,
            call,
          },
          z.any()
        );
      }

      for (const [bonus, n] of Object.entries(player.specialSummary)) {
        for (let i = 0; i != n; ++i) {
          await post(
            `/api/group/${groupId}/session/${gameId}/round/${round.id}/bonus`,
            {
              memberId: player.id,
              bonus,
            },
            z.any()
          );
        }
      }
    }

    // After all's done, we can safely go back to the round overview :)
    goBack();
  }

  function handleSaveClick() {
    const errors = collectSaveErrors();

    if (errors.length > 0) {
      saveErrors = errors;
      saveErrorDialogOpen = true;
      return;
    }

    // keine Fehler -> wirklich speichern
    saveRound();
  }

  // ================== Validierung: Darf gespeichert werden? ==================

  function canSaveRound(): boolean {
    // 1. alle Spieler müssen eine Seite haben (nicht "none")
    const allPlayersSet = players.every((p) => p.side !== null);

    // 2. Augen dürfen nicht leer sein
    const hasEyes = eyes !== 0;

    return allPlayersSet && hasEyes;
  }
</script>

<!-- ================== Layout ================== -->

<header class="page-header">
  <IconButton onclick={goBack}>
    <span class="material-icons">close</span>
  </IconButton>

  <IconButton>
    <span class="material-icons">more_vert</span>
  </IconButton>
</header>

<main class="page">
  <!-- ==== Karte: Spielvariante ==== -->
  <section class="card">
    <h2 class="card-title">Spielvariante</h2>

    <!-- Normal / Hochzeit / Solo -->
    <div class="segmented-row">
      <Button
        class={"segmented-btn " +
          (gameType === "NORMAL" ? "segmented-btn--active" : "")}
        variant={gameType === "NORMAL" ? "raised" : "outlined"}
        onclick={() => (gameType = "NORMAL")}
      >
        <Label>Normal</Label>
      </Button>

      <Button
        class={"segmented-btn " +
          (gameType.startsWith("HOCHZEIT_") ? "segmented-btn--active" : "")}
        variant={gameType.startsWith("HOCHZEIT_") ? "raised" : "outlined"}
        onclick={() => (gameType = "HOCHZEIT_NORMAL")}
      >
        <Label>Hochzeit</Label>
      </Button>

      <Button
        class={"segmented-btn " +
          (isSolo(gameType) ? "segmented-btn--active" : "")}
        variant={isSolo(gameType) ? "raised" : "outlined"}
        onclick={() => (gameType = "SOLO_BUBEN")}
      >
        <Label>Solo</Label>
      </Button>
    </div>

    <!-- Hochzeit-Untervariante -->
    {#if gameType.startsWith("HOCHZEIT_")}
      <div class="segmented-row segmented-row--sub">
        {#snippet WeddingOption(type: GameType, label: string)}
          <Button
            class={"segmented-btn " +
              (gameType === type ? "segmented-btn--active" : "")}
            variant={gameType === type ? "raised" : "outlined"}
            onclick={() => (gameType = type)}
          >
            <Label>{label}</Label>
          </Button>
        {/snippet}

        {@render WeddingOption("HOCHZEIT_NORMAL", "Normal")}
        {@render WeddingOption("HOCHZEIT_STILL", "Still")}
        {@render WeddingOption("HOCHZEIT_UNKNOWN", "Ungeklärt")}
      </div>
    {/if}

    <!-- Solo-Untervariante -->
    {#if isSolo(gameType)}
      <div class="segmented-row segmented-row--sub">
        <Button
          class={"segmented-btn " +
            (soloIsCompulsory ? "segmented-btn--active" : "")}
          variant={soloIsCompulsory ? "raised" : "outlined"}
          onclick={() => (soloIsCompulsory = true)}
        >
          <Label>Pflichtsolo</Label>
        </Button>

        <Button
          class={"segmented-btn " +
            (!soloIsCompulsory ? "segmented-btn--active" : "")}
          variant={!soloIsCompulsory ? "raised" : "outlined"}
          onclick={() => (soloIsCompulsory = false)}
        >
          <Label>Lustsolo</Label>
        </Button>
      </div>

      <div class="segmented-row segmented-row--sub trumpf-row">
        {#snippet SoloOption(type: GameType, label: string)}
          <Button
            class={"segmented-chip " +
              (gameType === type ? "segmented-chip--active" : "")}
            variant={gameType === type ? "raised" : "outlined"}
            onclick={() => (gameType = type)}
          >
            <Label>{label}</Label>
          </Button>
        {/snippet}

        <!--FIXME: Die Solo-Buttons sind zu breit für die meisten mobile screens -->
        {@render SoloOption("SOLO_BUBEN", "Buben")}
        {@render SoloOption("SOLO_DAMEN", "Damen")}
        {@render SoloOption("SOLO_ASSE", "Ass")}
        {@render SoloOption("SOLO_CLUBS", "♣")}
        {@render SoloOption("SOLO_SPADES", "♠")}
        {@render SoloOption("SOLO_HEARTS", "♥")}
        {@render SoloOption("SOLO_DIAMONDS", "♦")}
        <!--TODO: add the other solo options once the DTOs are ready-->
      </div>
    {/if}
  </section>

  <!-- ==== Karte: Erreichte Augensumme ==== -->
  <section class="card">
    <h2 class="card-title">Erreichte Augensumme</h2>

    <div class="segmented-row">
      <Button
        class={"segmented-btn " +
          (winnerSide === "RE" ? "segmented-btn--active" : "")}
        variant={winnerSide === "RE" ? "raised" : "outlined"}
        onclick={() => (winnerSide = "RE")}
      >
        <Label>Re</Label>
      </Button>

      <Button
        class={"segmented-btn " +
          (winnerSide === "KONTRA" ? "segmented-btn--active" : "")}
        variant={winnerSide === "KONTRA" ? "raised" : "outlined"}
        onclick={() => (winnerSide = "KONTRA")}
      >
        <Label>Contra</Label>
      </Button>
    </div>

    <!--Why is the top margin even necessary?????-->
    <Textfield
      label="Augen"
      variant="outlined"
      bind:value={eyes}
      withTrailingIcon
      class="eyes-textfield"
      type="number"
      style="margin-top: 16px"
    >
      {#snippet trailingIcon()}
        <Icon class="material-icons" role="button" onclick={() => (eyes = 0)}>
          close
        </Icon>
      {/snippet}
    </Textfield>
  </section>

  <!-- ==== Spieler-Karten ==== -->
  <section class="players-grid">
    {#each players as player}
      <article class="player-card">
        <div class="player-name">{player.name}</div>

        <!--FIXME: this needs to be an actual interactible element!-->
        <!-- Status-Balken (Re / Contra / Nicht gespielt) -->
        <div
          class={"player-status-row clickable-row " +
            (player.side === winnerSide
              ? "status-won"
              : player.side !== null
                ? "status-lost"
                : "status-none")}
          onclick={() => cyclePlayerSide(player)}
        >
          {player.side?.toString() ?? "Nicht gespielt"}
        </div>

        <!-- Sonderpunkte -->
        <div
          class="player-row clickable-row"
          onclick={() => open_extra_dialog(player)}
        >
          <div class="row-label">
            <strong>Sonderpunkte</strong>
            <div class="row-value">
              {Object.entries(player.specialSummary)
                .filter(([_, v]) => v !== 0)
                .map(([k, v]) => `${k}x${v}`)
                .join(", ")}
            </div>
          </div>
          <span class="material-icons row-icon">edit</span>
        </div>

        <!-- An- / Absagen -->
        <div
          class="player-row clickable-row"
          onclick={() => openAnnouncementDialog(player)}
        >
          <div class="row-label">
            <strong>An-/Absagen</strong>
            <div class="row-value">
              {Array.from(player.announcementSummary).join(", ")}
            </div>
          </div>
          <span class="material-icons row-icon">edit</span>
        </div>
      </article>
    {/each}
  </section>

  <!-- ==== Info + Speichern ==== -->
  <section class="info-section">
    {#if !canSaveRound()}
      <p class="info-text">
        Zum Speichern müssen alle Spielvarianten und Spieler gesetzt sein.
      </p>
    {/if}

    <Button
      class="save-button"
      variant="raised"
      disabled={!canSaveRound()}
      onclick={handleSaveClick}
    >
      <Label>Speichern</Label>
    </Button>
  </section>
</main>

<!-- ================== Ansagen-Dialog ================== -->

<Dialog bind:open={announcementDialogOpen}>
  <DialogTitle>Ansagen auswählen</DialogTitle>

  <DialogContent>
    <div class="dialog-chips-row">
      <!--FIXME: this is stupid >:(-->
      {#each ["KEINE90", "KEINE60", "KEINE30"] as const as opt}
        <Button
          class={"segmented-chip " +
            (activePlayer?.announcementSummary.has(opt)
              ? "segmented-chip--active"
              : "")}
          variant={activePlayer?.announcementSummary.has(opt)
            ? "raised"
            : "outlined"}
          onclick={() => toggleAnnouncementOption(opt)}
        >
          <Label>{opt}</Label>
        </Button>
      {/each}
    </div>
  </DialogContent>

  <DialogActions>
    <Button onclick={closeAnnouncementDialog}>
      <Label>Ok</Label>
    </Button>
  </DialogActions>
</Dialog>

<!-- ================== Sonderpunkte-Dialog ================== -->

<Dialog bind:open={extraDialogOpen}>
  <DialogTitle>Sonderpunkte auswählen</DialogTitle>

  <DialogContent>
    <div class="extra-row">
      <span>Fuchs</span>
      <div class="extra-counter">
        <Button variant="outlined" onclick={() => changeExtra("FUCHS", -1)}>
          <Label>-</Label>
        </Button>
        <span class="extra-value">{activePlayer?.specialSummary.FUCHS}</span>
        <Button variant="outlined" onclick={() => changeExtra("FUCHS", 1)}>
          <Label>+</Label>
        </Button>
      </div>
    </div>

    <div class="extra-row">
      <span>Doppelkopf</span>
      <div class="extra-counter">
        <Button variant="outlined" onclick={() => changeExtra("DOKO", -1)}>
          <Label>-</Label>
        </Button>
        <span class="extra-value">{activePlayer?.specialSummary.DOKO}</span>
        <Button variant="outlined" onclick={() => changeExtra("DOKO", 1)}>
          <Label>+</Label>
        </Button>
      </div>
    </div>

    <div class="extra-row">
      <Button
        class={"segmented-chip " +
          (activePlayer?.specialSummary.KARLCHEN != 0
            ? "segmented-chip--active"
            : "")}
        variant={activePlayer?.specialSummary.KARLCHEN ? "raised" : "outlined"}
        onclick={() =>
          (activePlayer!.specialSummary.KARLCHEN =
            1 - activePlayer!.specialSummary.KARLCHEN)}
      >
        <Label>Karlchen</Label>
      </Button>
    </div>
  </DialogContent>

  <DialogActions>
    <Button onclick={() => (extraDialogOpen = false)}>
      <Label>Ok</Label>
    </Button>
  </DialogActions>
</Dialog>
<!-- ================== Speichern-nicht-möglich Dialog ================== -->

<Dialog bind:open={saveErrorDialogOpen}>
  <DialogTitle>Speichern nicht möglich</DialogTitle>

  <DialogContent>
    <p>Die aktuellen Eintragungen sind ungültig.</p>
    <p>Hinweis:</p>

    <ul class="save-error-list">
      {#each saveErrors as error}
        <li>{error}</li>
      {/each}
    </ul>
  </DialogContent>

  <DialogActions>
    <Button onclick={() => (saveErrorDialogOpen = false)}>
      <Label>Ok</Label>
    </Button>
  </DialogActions>
</Dialog>

<!--FIXME: Ungenutzte/überflüssige CSS-Klassen-->
<style>
  :global(body) {
    margin: 0;
    font-family:
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      "Roboto",
      sans-serif;
  }

  .top-bar {
    box-shadow: none;
    border-bottom-width: 1px;
    border-bottom-style: solid;
  }

  .nav-icon-btn :global(.material-icons) {
    font-size: 24px;
  }
  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 16px 0;
  }

  .page {
    padding: 8px 16px 24px; /* statt 16/80 nach oben → 8px */
    box-sizing: border-box;
    max-width: 600px;
    margin: 0 auto;
  }

  /* Karten / Container */
  .card {
    border-radius: 16px;
    border-width: 1px;
    border-style: solid;
    padding: 16px 16px 20px;
    margin-bottom: 12px;
    overflow: visible;
  }

  .card-title {
    margin: 0 0 12px;
    font-size: 16px;
    font-weight: 500;
  }

  /* ========= Segmented Controls (Normal/Hochzeit/Solo, usw.)========= */

  /* Grundlayout für alle Segmented-Rows */
  .segmented-row {
    display: flex;
    flex-wrap: nowrap;
    gap: 0;
    border-radius: 999px;
    overflow: hidden;
  }
  /* Speziell für die Trumpf-Reihe */
  .segmented-row.trumpf-row {
    display: flex;
    width: 100%; /* nie breiter als die Karte */
    box-sizing: border-box;
  }

  .segmented-row--sub {
    margin-top: 12px;
  }

  .segmented-btn,
  .segmented-chip {
    min-height: 40px;
    text-transform: none;
    border-radius: 0;
    font-size: 14px;
    line-height: 1.2;
  }

  /* ========= Spieler-Karten ========= */

  .players-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin-top: 8px;
  }

  .player-card {
    border-radius: 16px;
    border-width: 1px;
    border-style: solid;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .player-name {
    padding: 10px 12px 4px;
    font-weight: 500;
  }

  .player-status-row {
    padding: 6px 12px;
    font-weight: 500;
    text-align: center;
  }

  /* Gewonnen = grün */
  .status-won {
    background-color: #4caf50;
    color: #ffffff;
  }

  /* Verloren = rot */
  .status-lost {
    background-color: #e53935;
    color: #ffffff;
  }

  /* Nicht gespielt = grau */
  .status-none {
    background-color: #e0e0e0;
    color: #212121;
  }

  .eyes-textfield {
    margin-top: 20px;
    width: 100%;
  }

  .player-row {
    padding: 8px 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    column-gap: 8px;
  }

  .row-label {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .row-value {
    font-size: 13px;
  }

  .row-icon {
    font-size: 18px;
  }

  .clickable-row {
    cursor: pointer;
  }

  /* ========= Footer / Speichern ========= */

  .info-section {
    margin-top: 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .info-text {
    margin: 0;
    font-size: 13px;
    text-align: center;
  }

  .save-button {
    width: 70%;
    border-radius: 999px;
    text-transform: none;
  }

  /* ========= Dialog-Styles ========= */

  .dialog-segmented-row {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
    justify-content: center;
  }

  .dialog-chips-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
  }

  .extra-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .extra-counter {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .extra-value {
    min-width: 20px;
    text-align: center;
  }
  .save-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .save-error-list {
    margin: 8px 0 0;
    padding-left: 20px;
  }

  .save-error-list li {
    margin-bottom: 4px;
  }
</style>
