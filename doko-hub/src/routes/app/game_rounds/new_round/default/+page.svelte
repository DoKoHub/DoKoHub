<script lang="ts">
  import TopAppBar, { Section, Title } from "@smui/top-app-bar";
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

  // ================== Typen ==================

  // Spielvariante
  type GameType = "normal" | "wedding" | "solo";

  // Hochzeit-Untervariante
  type WeddingType = "normal" | "silent" | "unclear";

  // Solo-Trumpf
  type SoloTrump =
    | "buben"
    | "damen"
    | "as"
    | "clubs"
    | "spades"
    | "hearts"
    | "diamonds";

  // Partei
  type Side = "re" | "contra" | "none";

  type Player = {
    name: string;
    side: Side;
    specialSummary: string; // z.B. "1 Fuchs, 1 Karlchen"
    announcementSummary: string; // z.B. "Re: K90"
  };

  // ================== Zustand ==================

  let gameType: GameType = "normal";
  let weddingType: WeddingType = "normal";
  let soloIsCompulsory = true; // true = Pflichtsolo, false = Lustsolo
  let soloTrump: SoloTrump = "buben";

  let winnerSide: Side = "re"; // Partei, die (voraussichtlich) gewinnt
  let eyes = "67";

  let players: Player[] = [
    {
      name: "Maurice",
      side: "none",
      specialSummary: "Keine",
      announcementSummary: "Keine",
    },
    {
      name: "Fabian",
      side: "none",
      specialSummary: "Keine",
      announcementSummary: "Keine",
    },
    {
      name: "Marcel",
      side: "none",
      specialSummary: "Keine",
      announcementSummary: "Keine",
    },
    {
      name: "Nick",
      side: "none",
      specialSummary: "Keine",
      announcementSummary: "Keine",
    },
  ];

  // Welcher Spieler wird gerade im Dialog bearbeitet?
  let activePlayerIndex: number | null = null;

  // ================== Navigation / AppBar ==================

  function goBack() {
    goto("/app/game/game_rounds");
  }

  // ================== Spielvariante auswählen ==================

  function selectGameType(type: GameType) {
    gameType = type;
  }

  function selectWeddingType(type: WeddingType) {
    weddingType = type;
  }

  function selectSoloKind(kind: "pflicht" | "lust") {
    soloIsCompulsory = kind === "pflicht";
  }

  function selectSoloTrump(trump: SoloTrump) {
    soloTrump = trump;
  }

  // ================== Augen / Siegerpartei ==================

  function selectWinnerSide(side: Side) {
    if (side === "none") return;
    winnerSide = side;
  }

  function clearEyes() {
    eyes = "";
  }

  // ================== Spieler-Seite toggeln ==================

  function cyclePlayerSide(index: number) {
    const current = players[index].side;
    let next: Side;

    if (current === "none") {
      // erster Klick → Gewinner-Partei, falls gesetzt, sonst "re"
      next = winnerSide === "re" || winnerSide === "contra" ? winnerSide : "re";
    } else if (current === "re") {
      next = "contra";
    } else {
      next = "none";
    }

    players[index] = { ...players[index], side: next };
  }

  // ================== Ansagen-Dialog ==================

  type AnnouncementSide = "re" | "contra";
  const ANNOUNCEMENT_OPTIONS = ["K90", "K60", "K30", "Schwarz"] as const;
  type AnnouncementOption = (typeof ANNOUNCEMENT_OPTIONS)[number];

  let announcementDialogOpen = false;
  let announcementSide: AnnouncementSide = "re";
  let selectedAnnouncements = new Set<AnnouncementOption>();

  function openAnnouncementDialog(index: number) {
    activePlayerIndex = index;
    announcementDialogOpen = true;

    const player = players[index];
    announcementSide = player.side === "contra" ? "contra" : "re";
    selectedAnnouncements = new Set();
  }

  function toggleAnnouncementOption(opt: AnnouncementOption) {
    const next = new Set(selectedAnnouncements);
    if (next.has(opt)) {
      next.delete(opt);
    } else {
      next.add(opt);
    }
    selectedAnnouncements = next;
  }

  function closeAnnouncementDialog() {
    announcementDialogOpen = false;
    activePlayerIndex = null;
  }

  function confirmAnnouncements() {
    if (activePlayerIndex === null) return;

    if (selectedAnnouncements.size === 0) {
      players[activePlayerIndex] = {
        ...players[activePlayerIndex],
        announcementSummary: "Keine",
      };
    } else {
      const sideLabel = announcementSide === "re" ? "Re" : "Contra";
      const optionsText = Array.from(selectedAnnouncements).join(", ");
      players[activePlayerIndex] = {
        ...players[activePlayerIndex],
        announcementSummary: `${sideLabel}: ${optionsText}`,
      };
    }

    closeAnnouncementDialog();
  }

  // ================== Sonderpunkte-Dialog ==================

  const EXTRA_TYPES = ["Fuchs", "Doppelkopf"] as const;
  type ExtraType = (typeof EXTRA_TYPES)[number];

  let extraDialogOpen = false;
  let extraFuchs = 0;
  let extraDoppelkopf = 0;
  let extraKarlchen = false;

  function openExtraDialog(index: number) {
    activePlayerIndex = index;
    extraDialogOpen = true;

    // Prototyp: Immer leer starten
    extraFuchs = 0;
    extraDoppelkopf = 0;
    extraKarlchen = false;
  }

  function changeExtra(kind: ExtraType, delta: number) {
    if (kind === "Fuchs") {
      extraFuchs = Math.max(0, extraFuchs + delta);
    } else {
      extraDoppelkopf = Math.max(0, extraDoppelkopf + delta);
    }
  }

  function toggleKarlchen() {
    extraKarlchen = !extraKarlchen;
  }

  function closeExtraDialog() {
    extraDialogOpen = false;
    activePlayerIndex = null;
  }

  function confirmExtra() {
    if (activePlayerIndex === null) return;

    const parts: string[] = [];
    if (extraFuchs > 0) parts.push(`${extraFuchs} Fuchs`);
    if (extraDoppelkopf > 0) parts.push(`${extraDoppelkopf} Doppelkopf`);
    if (extraKarlchen) parts.push("1 Karlchen");

    const text = parts.length > 0 ? parts.join(", ") : "Keine";

    players[activePlayerIndex] = {
      ...players[activePlayerIndex],
      specialSummary: text,
    };

    closeExtraDialog();
  }

  // ================== Speichern ==================

  function saveRound() {
    // Hier später API-Call einbauen
    console.log("Speichern (Prototyp)", {
      gameType,
      weddingType,
      soloIsCompulsory,
      soloTrump,
      winnerSide,
      eyes,
      players,
    });
  }
</script>

<!-- ================== Layout ================== -->

<TopAppBar variant="fixed" class="top-bar">
  <Section align="start">
    <IconButton class="nav-icon-btn" onclick={goBack}>
      <span class="material-icons">close</span>
    </IconButton>
    <Title>Neue Runde</Title>
  </Section>

  <Section align="end">
    <IconButton>
      <span class="material-icons">more_vert</span>
    </IconButton>
  </Section>
</TopAppBar>

<main class="page">
  <!-- ==== Karte: Spielvariante ==== -->
  <section class="card">
    <h2 class="card-title">Spielvariante</h2>

    <!-- Normal / Hochzeit / Solo -->
    <div class="segmented-row">
      <Button
        class={"segmented-btn " +
          (gameType === "normal" ? "segmented-btn--active" : "")}
        variant={gameType === "normal" ? "raised" : "outlined"}
        onclick={() => selectGameType("normal")}
      >
        <Label>Normal</Label>
      </Button>

      <Button
        class={"segmented-btn " +
          (gameType === "wedding" ? "segmented-btn--active" : "")}
        variant={gameType === "wedding" ? "raised" : "outlined"}
        onclick={() => selectGameType("wedding")}
      >
        <Label>Hochzeit</Label>
      </Button>

      <Button
        class={"segmented-btn " +
          (gameType === "solo" ? "segmented-btn--active" : "")}
        variant={gameType === "solo" ? "raised" : "outlined"}
        onclick={() => selectGameType("solo")}
      >
        <Label>Solo</Label>
      </Button>
    </div>

    <!-- Hochzeit-Untervariante -->
    {#if gameType === "wedding"}
      <div class="segmented-row segmented-row--sub">
        <Button
          class={"segmented-btn " +
            (weddingType === "normal" ? "segmented-btn--active" : "")}
          variant={weddingType === "normal" ? "raised" : "outlined"}
          onclick={() => selectWeddingType("normal")}
        >
          <Label>Normal</Label>
        </Button>

        <Button
          class={"segmented-btn " +
            (weddingType === "silent" ? "segmented-btn--active" : "")}
          variant={weddingType === "silent" ? "raised" : "outlined"}
          onclick={() => selectWeddingType("silent")}
        >
          <Label>Still</Label>
        </Button>

        <Button
          class={"segmented-btn " +
            (weddingType === "unclear" ? "segmented-btn--active" : "")}
          variant={weddingType === "unclear" ? "raised" : "outlined"}
          onclick={() => selectWeddingType("unclear")}
        >
          <Label>Ohne Klärung</Label>
        </Button>
      </div>
    {/if}

    <!-- Solo-Untervariante -->
    {#if gameType === "solo"}
      <div class="segmented-row segmented-row--sub">
        <Button
          class={"segmented-btn " +
            (soloIsCompulsory ? "segmented-btn--active" : "")}
          variant={soloIsCompulsory ? "raised" : "outlined"}
          onclick={() => selectSoloKind("pflicht")}
        >
          <Label>Pflichtsolo</Label>
        </Button>

        <Button
          class={"segmented-btn " +
            (!soloIsCompulsory ? "segmented-btn--active" : "")}
          variant={!soloIsCompulsory ? "raised" : "outlined"}
          onclick={() => selectSoloKind("lust")}
        >
          <Label>Lustsolo</Label>
        </Button>
      </div>

      <div class="segmented-row segmented-row--sub">
        <Button
          class={"segmented-chip " +
            (soloTrump === "buben" ? "segmented-chip--active" : "")}
          variant={soloTrump === "buben" ? "raised" : "outlined"}
          onclick={() => selectSoloTrump("buben")}
        >
          <Label>Buben</Label>
        </Button>

        <Button
          class={"segmented-chip " +
            (soloTrump === "damen" ? "segmented-chip--active" : "")}
          variant={soloTrump === "damen" ? "raised" : "outlined"}
          onclick={() => selectSoloTrump("damen")}
        >
          <Label>Damen</Label>
        </Button>

        <Button
          class={"segmented-chip " +
            (soloTrump === "as" ? "segmented-chip--active" : "")}
          variant={soloTrump === "as" ? "raised" : "outlined"}
          onclick={() => selectSoloTrump("as")}
        >
          <Label>AS</Label>
        </Button>

        <Button
          class={"segmented-chip " +
            (soloTrump === "clubs" ? "segmented-chip--active" : "")}
          variant={soloTrump === "clubs" ? "raised" : "outlined"}
          onclick={() => selectSoloTrump("clubs")}
        >
          <Label>♣</Label>
        </Button>

        <Button
          class={"segmented-chip " +
            (soloTrump === "spades" ? "segmented-chip--active" : "")}
          variant={soloTrump === "spades" ? "raised" : "outlined"}
          onclick={() => selectSoloTrump("spades")}
        >
          <Label>♠</Label>
        </Button>

        <Button
          class={"segmented-chip " +
            (soloTrump === "hearts" ? "segmented-chip--active" : "")}
          variant={soloTrump === "hearts" ? "raised" : "outlined"}
          onclick={() => selectSoloTrump("hearts")}
        >
          <Label>♥</Label>
        </Button>

        <Button
          class={"segmented-chip " +
            (soloTrump === "diamonds" ? "segmented-chip--active" : "")}
          variant={soloTrump === "diamonds" ? "raised" : "outlined"}
          onclick={() => selectSoloTrump("diamonds")}
        >
          <Label>♦</Label>
        </Button>
      </div>
    {/if}
  </section>

  <!-- ==== Karte: Erreichte Augensumme ==== -->
  <section class="card">
    <h2 class="card-title">Erreichte Augensumme</h2>

    <div class="segmented-row">
      <Button
        class={"segmented-btn " +
          (winnerSide === "re" ? "segmented-btn--active" : "")}
        variant={winnerSide === "re" ? "raised" : "outlined"}
        onclick={() => selectWinnerSide("re")}
      >
        <Label>Re</Label>
      </Button>

      <Button
        class={"segmented-btn " +
          (winnerSide === "contra" ? "segmented-btn--active" : "")}
        variant={winnerSide === "contra" ? "raised" : "outlined"}
        onclick={() => selectWinnerSide("contra")}
      >
        <Label>Contra</Label>
      </Button>
    </div>

    <Textfield
      label="Augen"
      variant="outlined"
      bind:value={eyes}
      withTrailingIcon
      class="eyes-textfield"
    >
      {#snippet trailingIcon()}
        <Icon class="material-icons" role="button" onclick={clearEyes}>
          close
        </Icon>
      {/snippet}
    </Textfield>
  </section>

  <!-- ==== Spieler-Karten ==== -->
  <section class="players-grid">
    {#each players as player, i}
      <article class="player-card">
        <div class="player-name">{player.name}</div>

        <!-- Status-Balken (Re / Contra / Nicht gespielt) -->
        <div
          class={"player-status-row clickable-row " +
            (player.side === "re"
              ? "status-re"
              : player.side === "contra"
                ? "status-contra"
                : "status-none")}
          on:click={() => cyclePlayerSide(i)}
        >
          {#if player.side === "re"}
            Re
          {:else if player.side === "contra"}
            Contra
          {:else}
            Nicht gespielt
          {/if}
        </div>

        <!-- Sonderpunkte -->
        <div
          class="player-row clickable-row"
          on:click={() => openExtraDialog(i)}
        >
          <div class="row-label">
            <strong>Sonderpunkte</strong>
            <div class="row-value">{player.specialSummary}</div>
          </div>
          <span class="material-icons row-icon">edit</span>
        </div>

        <!-- An- / Absagen -->
        <div
          class="player-row clickable-row"
          on:click={() => openAnnouncementDialog(i)}
        >
          <div class="row-label">
            <strong>An-/Absagen</strong>
            <div class="row-value">{player.announcementSummary}</div>
          </div>
          <span class="material-icons row-icon">edit</span>
        </div>
      </article>
    {/each}
  </section>

  <!-- ==== Info + Speichern ==== -->
  <section class="info-section">
    <p class="info-text">
      Zum Speichern müssen alle Spielvarianten und Spieler gesetzt sein.
    </p>

    <Button class="save-button" variant="raised" onclick={saveRound}>
      <Label>Speichern</Label>
    </Button>
  </section>
</main>

<!-- ================== Ansagen-Dialog ================== -->

<Dialog bind:open={announcementDialogOpen}>
  <DialogTitle>Ansagen auswählen</DialogTitle>

  <DialogContent>
    <div class="dialog-segmented-row">
      <Button
        class={"segmented-btn " +
          (announcementSide === "re" ? "segmented-btn--active" : "")}
        variant={announcementSide === "re" ? "raised" : "outlined"}
        onclick={() => (announcementSide = "re")}
      >
        <Label>Re</Label>
      </Button>

      <Button
        class={"segmented-btn " +
          (announcementSide === "contra" ? "segmented-btn--active" : "")}
        variant={announcementSide === "contra" ? "raised" : "outlined"}
        onclick={() => (announcementSide = "contra")}
      >
        <Label>Contra</Label>
      </Button>
    </div>

    <div class="dialog-chips-row">
      {#each ANNOUNCEMENT_OPTIONS as opt}
        <Button
          class={"segmented-chip " +
            (selectedAnnouncements.has(opt) ? "segmented-chip--active" : "")}
          variant={selectedAnnouncements.has(opt) ? "raised" : "outlined"}
          onclick={() => toggleAnnouncementOption(opt)}
        >
          <Label>{opt}</Label>
        </Button>
      {/each}
    </div>
  </DialogContent>

  <DialogActions>
    <Button onclick={closeAnnouncementDialog}>
      <Label>Abbrechen</Label>
    </Button>
    <Button onclick={confirmAnnouncements}>
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
        <Button variant="outlined" onclick={() => changeExtra("Fuchs", -1)}>
          <Label>-</Label>
        </Button>
        <span class="extra-value">{extraFuchs}</span>
        <Button variant="outlined" onclick={() => changeExtra("Fuchs", 1)}>
          <Label>+</Label>
        </Button>
      </div>
    </div>

    <div class="extra-row">
      <span>Doppelkopf</span>
      <div class="extra-counter">
        <Button
          variant="outlined"
          onclick={() => changeExtra("Doppelkopf", -1)}
        >
          <Label>-</Label>
        </Button>
        <span class="extra-value">{extraDoppelkopf}</span>
        <Button variant="outlined" onclick={() => changeExtra("Doppelkopf", 1)}>
          <Label>+</Label>
        </Button>
      </div>
    </div>

    <div class="extra-row">
      <Button
        class={"segmented-chip " +
          (extraKarlchen ? "segmented-chip--active" : "")}
        variant={extraKarlchen ? "raised" : "outlined"}
        onclick={toggleKarlchen}
      >
        <Label>Karlchen</Label>
      </Button>
    </div>
  </DialogContent>

  <DialogActions>
    <Button onclick={closeExtraDialog}>
      <Label>Abbrechen</Label>
    </Button>
    <Button onclick={confirmExtra}>
      <Label>Ok</Label>
    </Button>
  </DialogActions>
</Dialog>

<style>
  :global(body) {
    margin: 0;
    background: #f4eef9;
    font-family:
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      "Roboto",
      sans-serif;
  }

  .top-bar {
    background: #f4eef9;
    box-shadow: none;
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  }

  .nav-icon-btn :global(.material-icons) {
    font-size: 24px;
  }

  .page {
    padding: 80px 16px 32px;
    box-sizing: border-box;
    max-width: 600px;
    margin: 0 auto;
  }

  .card {
    border-radius: 16px;
    border: 1px solid rgba(0, 0, 0, 0.08);
    background: #f9f3ff;
    padding: 16px;
    margin-bottom: 16px;
  }

  .card-title {
    margin: 0 0 12px;
    font-size: 16px;
    font-weight: 500;
  }

  .segmented-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .segmented-row--sub {
    margin-top: 12px;
  }

  .segmented-btn {
    border-radius: 999px;
    text-transform: none;
  }

  .segmented-btn--active {
    /* Farbe kommt von SMUI-Theme – nur Form */
  }

  .segmented-chip {
    border-radius: 999px;
    text-transform: none;
    min-width: 56px;
    justify-content: center;
  }

  .segmented-chip--active {
    /* Farbe über Theme */
  }

  .eyes-textfield {
    margin-top: 16px;
    width: 100%;
  }

  .players-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin-top: 8px;
  }

  .player-card {
    border-radius: 16px;
    border: 1px solid rgba(0, 0, 0, 0.08);
    background: #f9f3ff;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .player-name {
    padding: 12px 12px 4px;
    font-weight: 500;
  }

  .player-status-row {
    padding: 6px 12px;
    font-weight: 500;
    text-align: center;
  }

  .status-re {
    background: #4caf50;
    color: white;
  }

  .status-contra {
    background: #c62828;
    color: white;
  }

  .status-none {
    background: #d6d6d6;
    color: #222;
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
    color: rgba(0, 0, 0, 0.7);
  }

  .save-button {
    width: 70%;
    border-radius: 999px;
    text-transform: none;
  }

  /* Dialog-Styles */

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
</style>
