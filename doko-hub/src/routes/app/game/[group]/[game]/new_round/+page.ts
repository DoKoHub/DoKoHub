import { get } from "$lib/frontend/fetch";
import { Round, Session, UUID } from "$lib/types";
import z from "zod";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ params, fetch }) => {
  const groupId = UUID.parse(params.group);
  const gameId = UUID.parse(params.game);

  const session = await get(
    `/api/group/${groupId}/session/${gameId}`,
    Session,
    fetch
  );

  const rounds = await get(
    `/api/group/${groupId}/session/${gameId}/round`,
    z.array(Round),
    fetch
  );

  return { session, next_round_number: rounds.length + 1 };
};
