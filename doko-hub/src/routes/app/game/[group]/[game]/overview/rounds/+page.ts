import { get } from "$lib/frontend/fetch";
import { Session, UUID } from "$lib/types";
import type { PageLoad } from "./$types";
import { z } from "zod";


// erstmal nur als Platzhalter, bis passende types.ts finden 
const SessionMemberSchema = z.any();

export const load: PageLoad = async({ params, fetch }) => {
    const groupId = UUID.parse(params.group);
    const sessionId = UUID.parse(params.game);
    const session = await get(
        `/api/group/${groupId}/session/${sessionId}`,
        Session,
        fetch
    );

    const sessionMembers = await get(
    `/api/group/${groupId}/session/${sessionId}/sessionmember`,
    z.array(SessionMemberSchema),
    fetch
  );

   return { session, sessionMembers };
};