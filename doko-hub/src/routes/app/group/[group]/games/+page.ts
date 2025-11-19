import { get } from "$lib/frontend/fetch";
import { Session, UUID } from "$lib/types";
import type { PageLoad } from "./$types";
import { z } from "zod";

export const load: PageLoad = async ({ params, fetch }) => {
  const group_id = UUID.parse(params.group);
  const sessions = await get(
    `/api/group/${group_id}/session`,
    z.array(Session),
    fetch
  );

  return {
    sessions,
  };
};
