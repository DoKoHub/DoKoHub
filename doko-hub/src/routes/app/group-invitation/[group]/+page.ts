import { get } from "$lib/frontend/fetch"; // +page.ts
import { PlayGroupMember, PlayGroup, UUID } from "$lib/types";
import type { PageLoad } from "./$types";
import { z } from "zod"; // +page.ts

export const load: PageLoad = async ({ params, fetch }) => {
  // Gruppen-ID aus URL /app/group-invitation/[group]
  const groupId = UUID.parse(params.group);

  const group = await get(`/api/group/${groupId}`, PlayGroup, fetch);
  const groupName = group.name;
  // FIX ME: Probleme Namen zu bekommen

  // Mitglieder aus Gruppe
  let members: PlayGroupMember[] = [];

  try {
    members = await get(
      `/api/group/${groupId}/member`,
      z.array(PlayGroupMember),
      fetch
    );
  } catch (e) {
    console.error(`Error while fetching members for group ${groupId}`, e);
    const json = await fetch(`/api/group/${groupId}/member`).then((r) =>
      r.json()
    );
    console.log(json);
  }

  return {
    groupId,
    members,
    //groupName,
  };
};
