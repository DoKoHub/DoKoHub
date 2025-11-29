<script lang="ts">
  import Button from "@smui/button";
  import PlusButton from "$lib/components/PlusButton.svelte";

  function addSomething() {}

  // Beispielspieler
  let players = ["Marcel", "Fabian", "Nick", "Maurice"];

  // Dummy Daten für Erg
  function getRounds() {
    return [
      // Runde 1
      {
        points: ["+3", "-3", "+3", "-3"],
        winners: [true, false, true, false],
      },
      // Runde 2
      {
        points: ["-1", "-1", "+1", "-1"],
        winners: [false, true, true, false],
      },
      // Runde 3
      {
        points: ["+9", "-3", "-3", "-3"],
        winners: [true, false, false, false], // z.B. Team von Spieler 1 hat gewonnen
      },
      // Runde 4 (alle 0)
      {
        points: ["0", "0", "0", "0"],
        winners: [true, true, false, false], // 0 kann dennoch grün ODER rot sein
      },
    ];
  }

  function colorClass(value: string, winner: boolean) {
    // Pflichtsolo / neutral
    if (value === "X") return "neutral";

    // 0: Gewinner/Verlierer
    if (value === "0") return winner ? "green" : "red";

    // reguläre Punkte
    if (value.startsWith("+")) return "green";
    if (value.startsWith("-")) return "red";

    return "neutral";
  }

  const rounds = getRounds();

  let columns = players.map((_, pIndex) => {
    return rounds.map((r) => ({
      value: r.points[pIndex],
      winner: r.winners[pIndex],
    }));
  });

  // Dummy Pflichtsolo-Daten
  const pflichtsolo = [
    ["X", "-", "X", "-"], 
    ["-2", "+6", "-2", "-2"], 
    ["-", "X", "-", "X"], 
    ["-", "-", "-", "-"], 
  ];

  // Dummy Summe-Daten
  const sum = {
    values: ["+11", "-3", "-1", "-9"],
    winners: [true, false, false, false], 
  };
</script>

<div class="page-content">
  <PlusButton {addSomething} />

  <!-- buttons für Spieler -->
  <div
    class="players"
    style="display: grid; grid-template-columns: 60px repeat({players.length}, 1fr); gap: 12px;"
  >
    <div class="round-number"></div>
    <!-- leere Zelle über den Rundennummern -->

    {#each players as p}
      <Button class="player-btn" variant="outlined">{p}</Button>
    {/each}
  </div>

  <!-- Aufbau Runden -->
  <div
    class="round-grid"
    style="display: grid; grid-template-columns: 60px repeat({columns.length}, 1fr); gap: 12px;"
  >
    <!-- Spalte: Rundennummer -->
    {#each columns[0] as _, rIndex}
      <div class="round-number">{rIndex + 1}</div>

      <!-- Spalte: Punkte pro Spieler -->
      {#each columns as col}
        <div class="cell {colorClass(col[rIndex].value, col[rIndex].winner)}">
          {col[rIndex].value}
        </div>
      {/each}

      <!-- Divider nach jeder 4. Runde -->
      {#if (rIndex + 1) % 4 === 0}
        <div class="divider" style="grid-column: 1 / -1;"></div>
      {/if}
    {/each}
  </div>

  <!-- Pflichtsolo Titel -->
  <div class="section-title">Pflichtsolos</div>

  <div
    class="round-grid"
    style="display: grid; grid-template-columns: 60px repeat({players.length}, 1fr); gap: 12px;"
  >
    {#each pflichtsolo as row, rIndex}
      <!-- Zeilennummer -->
      <div class="round-number">{rIndex + 1}</div>

      <!-- Zellen pro Spieler -->
      {#each row as value, pIndex}
        <div class="cell {colorClass(value, false)}">
          {value}
        </div>
      {/each}
    {/each}
  </div>

  <!-- Summe -->
  <div class="section-title">Summe</div>

  <div
    class="round-grid"
    style="display: grid; grid-template-columns: 60px repeat({columns.length}, 1fr); gap: 12px;"
  >
    <div class="round-number"></div>

    {#each sum.values as value, i}
      <div class="cell {colorClass(value, sum.winners[i])}">
        {value}
      </div>
    {/each}
  </div>
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
