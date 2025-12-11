// src/routes/app/group/[group]/members/+page.ts
import type { PageLoad } from "./$types";
import { PlayGroupMember, Player } from "$lib/types";
import { get } from "$lib/frontend/fetch";
import z from "zod";
import { UUID } from "$lib/types";

/*
  Wird von SvelteKit aufgerufen, wenn die Seite geladen wird.
  Hier holen wir:
    - die Gruppen-ID aus der URL
    - alle Mitglieder dieser Gruppe vom Backend
*/
export const load: PageLoad = async ({ params, fetch }) => {
  //  Gruppen-ID aus URL /app/group/[group]/members
  const groupId = UUID.parse(params.group);

  // 1. Mitglieder dieser Gruppe laden
  let members: PlayGroupMember[] = [];

  try {
    members = await get(
      `/api/group/${groupId}/member`,
      z.array(PlayGroupMember),
      fetch
    );
  } catch (e) {
    console.error(`Error while fetching members for group ${groupId}`, e);
  }
  // 2. Alle Spieler im System laden (für Liste im Dialog)
  let allPlayers: Player[] = [];
  try {
    allPlayers = await get("/api/player", z.array(Player), fetch);
  } catch (e) {
    console.error("Error while fetching players", e);
  }

  // 3. Spieler, die bereits Mitglied in dieser Gruppe sind, herausfiltern
  const memberIds = new Set(members.map((m) => m.playerId));
  const availablePlayers = allPlayers.filter((p) => !memberIds.has(p.id));

  //  Daten an +page.svelte übergeben
  return {
    groupId,
    members,
  };
};

// Kein Server-Side-Rendering – alles nur im Browser
export const ssr = false;
