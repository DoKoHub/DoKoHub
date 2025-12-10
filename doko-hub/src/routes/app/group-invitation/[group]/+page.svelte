<script lang="ts">
  import BottomAppBar, { Section } from "@smui-extra/bottom-app-bar";
  import Button from "@smui/button";
  import Card from "@smui/card";
  import TextField from "@smui/textfield";
  import FormField from "@smui/form-field";
  import Radio from "@smui/radio";

  import type { PageData } from "./$types";
  import { post } from "$lib/frontend/fetch";
  import { get_user } from "$lib/frontend/auth";
  import z from "zod";

  // Daten aus .ts
  export let data: PageData;
  const { groupId, members } = data;
  // FIX Me Gruppennamen
  const groupName = ""; // DOTO

  let active: "groups" | "stats" | "profile" = "groups";

  // id ausgewählten members durch radio button
  let selectedMemberId: string | null = null;

  // Eingabe aus dem Textfeld
  let newName = "";

  async function joinGroup() {
    const player = get_user(); // aktuell eingeloggt, den hinzufügen unter neuem nickname

    const selectedMember = members.find((m) => m.id === selectedMemberId);
    const name = (selectedMember?.nickname ?? newName).trim();

    // Name immer abfragen
    // Logik für Name überschreiben
    // unter dem vorhandenen Namen beitreten
    if (selectedMember) {
      await post(
        `/api/group/${groupId}/member`,
        {
          playerId: player.id,
          nickname: selectedMember.nickname,
        },
        z.any()
      );
    } else {
      // Spieler der Gruppe hinzufügen: Eingabefeld
      await post(
        `/api/group/${groupId}/member`,
        {
          playerId: player.id,
          nickname: name,
        },
        z.any()
      );
    }
  }
</script>

<main class="page">
  <Card class="join-card">
    <h2 class="title">Gruppe beitreten</h2>
    <p class="subtitle">
      Die Gruppe <strong>{groupName}</strong> freut sich über neue Mitspieler. Wähle
      nachfolgend einen Namen und trete der Gruppe bei.
    </p>

    <!-- Spieler-Liste -->
    <div class="player-list">
      {#each members as member}
        <FormField>
          <label class="player-option">
            <Radio bind:group={selectedMemberId} value={member.id} />
            <span>{member.nickname}</span>
          </label>
        </FormField>
      {/each}
    </div>

    <div class="divider">oder</div>

    <TextField
      bind:value={newName}
      label="Name"
      variant="filled"
      class="new-name-field"
    />

    <Button
      variant="raised"
      color="primary"
      class="join-button"
      disabled={!selectedMemberId && !newName}
      onclick={joinGroup}
    >
      Gruppe beitreten
    </Button>
  </Card>
</main>

<BottomAppBar variant="fixed" color="primary" class="bottom-bar">
  <Section class="nav-section">
    <button
      class="nav-item"
      class:active={active === "groups"}
      on:click={() => (active = "groups")}
    >
      Gruppen
    </button>

    <button
      class="nav-item"
      class:active={active === "stats"}
      on:click={() => (active = "stats")}
    >
      Meine Statistiken
    </button>

    <button
      class="nav-item"
      class:active={active === "profile"}
      on:click={() => (active = "profile")}
    >
      Profil
    </button>
  </Section>
</BottomAppBar>

<style>
  main.page {
    display: flex;
    justify-content: center;
    align-items: flex-start;
    min-height: calc(100vh - 56px);
    padding: 2rem 1rem 6rem;
  }

  :global(.join-card) {
    padding: 1.25rem 1.5rem;
    padding-left: 30px;
  }
  /* Überschrift in card */
  .title {
    margin-bottom: 0.5rem;
    /*font-size: 1.5rem;
    font-weight: 600; */
  }

  .subtitle {
    margin-bottom: 1rem;
  }

  .player-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-bottom: 0.5rem;
  }

  .player-option {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.3rem 0;
  }

  /* divider oder */
  .divider {
    text-align: center;
    margin: 0.75rem 0;
  }
</style>
