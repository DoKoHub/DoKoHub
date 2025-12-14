import { get } from "$lib/frontend/fetch";
//import { round, roundCall } from "$lib/server/db/schema";
//import type { APIRoute } from "$lib/server/routes";
import {
  Session,
  UUID,
  Round,
  RoundParticipation,
  RoundCall,
  RoundBonus,
  PlayGroup,
} from "$lib/types";
import type { PageLoad } from "./$types";
import { any, z } from "zod";

// erstmal nur als Platzhalter, bis passende types.ts finden
const SessionMemberSchema = z.any();
const GroupMemberSchema = z.any();

export const load: PageLoad = async ({ params, fetch }) => {
  const groupId = UUID.parse(params.group);
  const group = await get(`/api/group/${groupId}`, PlayGroup, fetch);

  const sessionId = UUID.parse(params.game);
  const session = await get(
    `/api/group/${groupId}/session/${sessionId}`,
    Session,
    fetch
  );

  // 1️. SessionMembers (Sitzordnung)
  const sessionMembers = await get(
    `/api/group/${groupId}/session/${sessionId}/sessionmember`,
    z.array(SessionMemberSchema),
    fetch
  );
  // 2️. GroupMembers (Namen)
  const groupMembers = await get(
    `/api/group/${groupId}/member`,
    z.array(GroupMemberSchema),
    fetch
  );
  // Runden
  // api/group/[group]/session/[session]/round
  const rounds = await get(
    `/api/group/${groupId}/session/${sessionId}/round`,
    z.array(Round),
    fetch
  );

  const result = [];
  const players = sessionMembers;

  for (const round of rounds) {
    const roundId = round.id;

    // Participations einer Runde
    // api/group/[group]/session/[session]/round/[round]/participation
    const participation = await get(
      `/api/group/${groupId}/session/${sessionId}/round/${roundId}/participation`,
      RoundParticipation,
      fetch
    );

    // RoundCall
    //api/group/[group]/session/[session]/round/[round]/call
    const call = await get(
      `/api/group/${groupId}/session/${sessionId}/round/${roundId}/call`,
      RoundCall,
      fetch
    );

    // RoundBonus
    //api/group/[group]/session/[session]/round/[round]/bonus
    const bonus = await get(
      `/api/group/${groupId}/session/${sessionId}/round/${roundId}/bonus`,
      RoundBonus,
      fetch
    );

    // Punkte pro Spieler - NUR ANSATZ
    // DOTO
    const pointsByPlayerId = Object.fromEntries(
      players.map((p) => [p.playerId ?? p.id, null])
    ) as Record<string, number | null>;

    result.push({
      roundId,
      participation,
      call,
      bonus,
      pointsByPlayerId,
    });
  }

  return {
    session,
    sessionId,
    groupId,
    groupMembers,
    sessionMembers,
    rounds: result,
  };
};
