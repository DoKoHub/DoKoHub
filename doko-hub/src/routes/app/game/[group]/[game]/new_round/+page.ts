import { get } from "$lib/frontend/fetch";
import { Session, UUID } from "$lib/types";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ params, fetch }) => {
  const groupId = UUID.parse(params.group);
  const gameId = UUID.parse(params.game);

  const session = await get(
    `/api/group/${groupId}/session/${gameId}`,
    Session,
    fetch
  );

  return { session };
};
