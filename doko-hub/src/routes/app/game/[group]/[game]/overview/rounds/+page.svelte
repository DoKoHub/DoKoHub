<script lang="ts">
  import Button from "@smui/button";
  import PlusButton from "$lib/components/PlusButton.svelte";
  import { goto } from "$app/navigation";
  import type { PageProps } from "./$types";
  import { UUID } from "$lib/types";
  import { post } from "$lib/frontend/fetch";
  import { z } from "zod";
  import type { PageData } from "./$types";

  // Funktion für Plus Button
  function addSomething() {
    //goto(`/app/game/${params.group}/${sessionId}/new_round`);
  }

  /**
   * FIXME
   *
   * TODO: Ganzer Code unterhalb überarbeiten
   * Code ist nicht an das Datenbankmodell angepasst
   *
   * Fix Vorschlag:
   * Backend so überarbeiten, dass das "Session" Objekt eine Liste der Rounds beinhaltet.
   * Backend so Überarbeiten, dass das "Round" Objekt alle RoundBonus, RoundCall und RoundParticipation Objekte beinhaltet
   *
   * Mit der gegebenen Session, die dann alle Daten beinhaltet, kann der unten stehende Code leicht reworked werden.
   * Ein weiterer Vorteil wäre, dass man nur eine GET Request an das Backend senden muss und nicht viele.
   */

  // players ohne Dummy
  /*const players = [...sessionMembers]
    .sort((a, b) => a.seatPos - b.seatPos)
    .map((sm) => {
      const gm = groupMembers.find((m: any) => m.id === sm.memberId);
      return gm?.nickname ?? "?";
    }); */

  // ====== Ab hier neu: =========

  // Daten aus .ts
  export let data: PageData;

  // Zugriff:
  //const rounds = data.rounds; // result-Array
  const rounds = Array.isArray(data.rounds) // Array
    ? data.rounds
    : data.rounds
      ? [data.rounds]
      : [];
  const players = data.sessionMembers; // Spalten
  const playerIds = players.map((p) => p.id); // Reihenfolge der Spalten
  const sessionId = data.sessionId;
  const groupId = data.groupId;

  // TODO addFourRounds statt neue Runde
  async function createRound() {
    const nextRoundNum = (data.rounds?.length ?? 0) + 1;

    await post(
      `/api/group/${groupId}/session/${sessionId}/round`,
      {
        roundNum: nextRoundNum,
        gameType: "NORMAL", // DOTO muss zum GameType passen
        soloKind: null,
        eyesRe: 0,
      },
      z.any()
    );
  }

  // Hilfsfunktion für Anzeige
  const nameOf = (p: any) => p.nickname;

  // Logik für Runden
  // Rundennummer
  const roundLabel = (r: any, index: number) =>
    r?.round?.roundNum ?? r?.roundNum ?? index + 1;

  // Hilfsfunktion
  const valueFor = (r: any, playerId: string): number | null =>
    r?.pointsByPlayerId?.[playerId] ?? null;

  // Formatierung für UI Anzeige
  const fmt = (v: number | null) =>
    v === null ? "—" : v > 0 ? `+${v}` : `${v}`;

  // Farben für UI Anzeige
  function colorClass(v: number | null) {
    if (v === null) return "neutral"; // noch keine Punkte berechnet = grau
    if (v > 0) return "green";
    if (v < 0) return "red";
    return "neutral"; // 0 = neutral
  }

  // === Pflichtsolo Logik ===
  // Hilfsfunktion, prüfen ob solo Runde
  const isSoloRound = (r: any) =>
    (r?.round?.gameType ?? r?.gameType ?? "").startsWith("SOLO_");

  // Solo-Runden herausfiltern
  const soloRounds = rounds.filter(isSoloRound);

  // Participations holen
  const partsOf = (r: any) => r?.participation ?? r?.participations ?? [];

  // ID aus Participation holen (playerId/memberId)
  const idOfPart = (p: any) => p.playerId ?? p.memberId ?? p.id;

  // Solo Spieler bestimmen
  function soloistIdOf(r: any): string | null {
    const parts = partsOf(r);

    const re = parts.filter((p: any) => p.side === "RE");
    const ko = parts.filter((p: any) => p.side === "KONTRA");

    if (re.length === 1) return idOfPart(re[0]);
    if (ko.length === 1) return idOfPart(ko[0]);

    return null;
  }
  // Map: SpielerId -> die Solo-Runde dieses Spielers
  const soloRoundByPlayerId = new Map<string, any>();

  for (const r of soloRounds) {
    const soloistId = soloistIdOf(r);
    if (soloistId && !soloRoundByPlayerId.has(soloistId)) {
      soloRoundByPlayerId.set(soloistId, r);
    }
  }
  type PfCell = number | null | "X" | "-";

  // Pflichtsolo-Tabelle: 1 Zeile pro Spieler
  const pflichtsoloRows: PfCell[][] = playerIds.map((pid) => {
    const soloRound = soloRoundByPlayerId.get(pid);
    // Spieler hat Solo gespielt = Punkte dieser Solo-Runde anzeigen
    if (soloRound) {
      return playerIds.map(
        (cellPid) => soloRound?.pointsByPlayerId?.[cellPid] ?? null
      );
    }
    // Spieler hat noch kein Solo gespielt -> X / -
    return playerIds.map((cellPid) => (cellPid === pid ? "X" : "-"));
  });

  // ==== Summe berechnen (Runde für Runde) ====
  const totalFor = (playerId: string) =>
    rounds.reduce(
      (sum: number, r: any) => sum + (valueFor(r, playerId) ?? 0),
      0
    );
</script>

<div class="page-content">
  <PlusButton {addSomething} />

  <!-- buttons für Spieler -->
  <div
    class="players"
    style="display: grid; grid-template-columns: 60px repeat({players.length}, 1fr); gap: 12px;"
  >
    <div class="round-number"></div>

    {#each players as p (p.id)}
      <Button class="player-btn" variant="outlined">{nameOf(p)}</Button>
    {/each}
  </div>

  <!-- Aufbau Runden -->
  <div
    class="round-grid"
    style="display: grid; grid-template-columns: 60px repeat({players.length}, 1fr); gap: 12px;"
  >
    {#each rounds as r, rIndex}
      <!-- Spalte: Rundennummer -->
      <div class="round-number">{roundLabel(r, rIndex)}</div>

      <!-- Spalten: Punkte pro Spieler -->
      {#each playerIds as pid}
        {@const v = valueFor(r, pid)}
        <div class="cell {colorClass(v)}">
          {fmt(v)}
        </div>
      {/each}

      <!-- Divider nach jeder 4. Runde -->
      {#if (rIndex + 1) % 4 === 0}
        <div class="divider" style="grid-column: 1 / -1;"></div>
      {/if}
    {/each}
  </div>

  {#each pflichtsoloRows as row, rIndex}
    <div class="round-number">{rIndex + 1}</div>

    {#each row as cell}
      {#if typeof cell === "number" || cell === null}
        <div class="cell {colorClass(cell)}">{fmt(cell)}</div>
      {:else}
        <div class="cell neutral">{cell}</div>
      {/if}
    {/each}
  {/each}

  <!-- Summe -->
  <div class="section-title">Summe</div>

  <div
    class="round-grid"
    style="display: grid; grid-template-columns: repeat({players.length}, 1fr); gap: 12px;"
  >
    {#each playerIds as pid}
      {@const t = totalFor(pid)}
      <div class="cell {colorClass(t)}">{fmt(t)}</div>
    {/each}
  </div>

  <!-- Plusbutton-->
  <PlusButton {addSomething} />
</div>

<style>
  .page-content {
    padding: 0 16px; /* Platz links/rechts */
  }
  .players {
    margin: 16px 0;
  }

  .rounds {
    display: flex;
    flex-direction: column; /* untereinander anordnen */
    gap: 10px;
  }

  .round-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-top: 20px;
  }

  .column {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: center; /*  mittig unter Namen */
  }

  .cell {
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 4px;
  }

  :global(.round-number) {
    display: flex;
    align-items: center;
  }

  :global(.green) {
    background: #59c36a !important;
    color: white !important;
  }

  :global(.red) {
    background: #c74343 !important;
    color: white !important;
  }

  :global(.neutral) {
    background-color: #9e9e9e;
    color: white;
  }

  .divider {
    height: 2px;
    margin: 4px 0;
  }

  .section-title {
    margin: 16px 0 8px;
  }
</style>
