<!--Clanker Code >:(-->
<script lang="ts">
  import PlusButton from "$lib/components/PlusButton.svelte";

  import List, {
    Item,
    PrimaryText,
    Graphic,
    Meta,
    Separator,
  } from "@smui/list";

  import Dialog, {
    Title as DialogTitle,
    Content as DialogContent,
    Actions as DialogActions,
  } from "@smui/dialog";
  import Button, { Label } from "@smui/button";
  import Textfield from "@smui/textfield";
  import Icon from "@smui/textfield/icon";

  // ==== Daten aus +page.ts ====
  import type { PageProps } from "./$types";
  import { PlayGroupMember } from "$lib/types";
  import { get, post } from "$lib/frontend/fetch";
  import z from "zod";
  import { get_user } from "$lib/frontend/auth";
  import type { APIRoute } from "$lib/server/routes";

  const MAX_PLAYERS = 4;

  const { data }: PageProps = $props();

  // Gruppen-ID und Mitglieder aus dem load()
  const groupId = data.groupId;
  let members = $state(data.members);

  // aktueller Spieler (für playerId beim POST)
  const user = get_user();

  // ==== UI: Tabs, AppBar, Buttons ====

  function addSomething() {
    console.log("Plus-Button gedrückt");

    // Wenn schon 4 Spieler: keinen Dialog mehr öffnen
    if (members.length >= MAX_PLAYERS) {
      console.log("Maximal 4 Spieler erlaubt");
      // optional:
      // alert("Du kannst maximal 4 Spieler in einer Gruppe haben.");
      return;
    }

    // Plus-Button öffnet den "Neuer Spieler"-Dialog
    openAddDialog();
  }

  // ==== Dialog "Spieler hinzufügen" ====

  let addOpen = $state(false);
  let newName = $state("");

  function openAddDialog() {
    // sicherheitshalber Edit-Dialog schließen
    editOpen = false;
    newName = "";
    addOpen = true;
  }

  function cancelAdd() {
    addOpen = false;
    newName = "";
  }
  // Fehler ist Backend mit neue Id Spieler, um neue Speler hinzufügen
  // POST /api/group/[group]/member
  async function confirmAdd() {
    // 1. Sicherheit: Max 4 Spieler
    if (members.length >= MAX_PLAYERS) {
      console.log("Maximal 4 Spieler - neuer Spieler wird nicht hinzugefügt");
      addOpen = false;
      newName = "";
      return;
    }
    const nickname = newName.trim();
    if (!nickname) return;

    try {
      console.log("confirmAdd START", {
        nickname,
        currentCount: members.length,
      });

      // 1️.Spieler im Backend anlegen
      const response = await post(
        `/api/group/${groupId}/member`,
        {
          nickname,
        },
        z.object({
          message: z.string(),
          playGroupMember: PlayGroupMember,
        })
      );

      console.log(
        "POST OK, neuer Spieler vom Backend:",
        response.playGroupMember
      );

      //FIXME: Das ist ineffizient! Das backend returned den neuen Member bereits
      // 2️.Mitgliederliste danach NEU vom Backend laden
      const updatedMembers = await get(
        `/api/group/${groupId}/member` as APIRoute,
        z.array(PlayGroupMember)
      );

      console.log("GET OK, aktualisierte Mitgliederliste:", updatedMembers);

      // 3. Neue Liste in State schreiben → UI aktualisiert sich
      members = updatedMembers;

      // 4️. Dialog schließen + Eingabe leeren
      addOpen = false;
      newName = "";
    } catch (e) {
      console.error("Fehler beim Hinzufügen oder Neuladen der Mitglieder", e);
    }
  }

  // ==== Dialog "Spieler bearbeiten" ====

  let editOpen = $state(false);
  let editIndex = $state<number | null>(null);
  let editName = $state("");

  // beim Klick auf einen Listeneintrag
  function openEdit(i: number) {
    addOpen = false;
    editIndex = i;
    editName = members[i]?.nickname ?? "";
    editOpen = true;
  }

  function cancelEdit() {
    editOpen = false;
    editName = "";
    editIndex = null;
  }

  // PUT /api/group/[group]/member/[member]
  async function confirmEdit() {
    //FIXME: PlayerID is not set correctly on POST request!
    const nickname = editName.trim();
    if (!nickname || editIndex === null) return;

    const current = members[editIndex];

    // Body laut API-Doku
    const bodyToSend = {
      playGroupMember: {
        ...current,
        nickname,
      },
    };

    try {
      //FIXME: bitte post benutzen!!! ($lib/frontend/fetch.ts)
      const res = await fetch(`/api/group/${groupId}/member/${current.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyToSend),
      });

      if (!res.ok) {
        console.error("Fehler beim Bearbeiten", await res.text());
        return;
      }

      const parsed = z
        .object({
          message: z.string(),
          playGroupMember: PlayGroupMember,
        })
        .parse(await res.json());

      const updated = parsed.playGroupMember;

      // Mitglied in der Liste ersetzen
      members = members.map((m) => (m.id === updated.id ? updated : m));

      editOpen = false;
      editName = "";
      editIndex = null;
    } catch (e) {
      console.error("PUT fehlgeschlagen", e);
    }
  }
</script>

<PlusButton {addSomething} />

<!-- Beispiel Inhalt -->
<!--
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

-->

<main class="main-content">
  <List class="player-list">
    {#each members as member, i}
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
        <PrimaryText>{member.nickname ?? "Ohne Namen"}</PrimaryText>
        <Meta class="material-icons" aria-hidden="true">edit</Meta>
      </Item>
      <Separator />
    {/each}
  </List>
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
