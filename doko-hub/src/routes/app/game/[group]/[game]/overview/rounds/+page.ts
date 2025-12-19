import { get } from "$lib/frontend/fetch";
import {
  Session,
  UUID,
  Round,
  RoundParticipation,
  RoundCall,
  RoundBonus,
  PlayGroup,
  PlayGroupMember,
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

  // api/group/[group]/session/[session]/result
  //const pointsByMemberId = _calculateRoundPoints
  /*
  FIXME: Aktuell werden nur Session-Gesamtpunkte geladen
  TODO: Für die UI (Rundenmatrix) werden pro Runde Spielerpunkte benötigt
  -> pro Runde _calculateRoundPoints (round, participation, call, bonus) ausführen und round.pointsByMemberId befüllen
  */
  const SessionResultRow = z.object({
    player_id: z.string(),
    member_id: z.string(),
    player_name: z.string(),
    seat_pos: z.number(),
    points: z.number(),
  });

  const ResultResponse = z.object({
    results: z.array(SessionResultRow),
    message: z.string().optional(),
  });

  const resultResp = await get(
    `/api/group/${groupId}/session/${sessionId}/result`,
    ResultResponse,
    fetch
  );

  const totalPointsByMemberId = Object.fromEntries(
    resultResp.results.map((r) => [r.member_id, r.points])
  );

  const result = [];
  const players = sessionMembers;

  for (const round of rounds) {
    const roundId = round.id;

    // Participations einer Runde
    // api/group/[group]/session/[session]/round/[round]/participation
    const participation = await get(
      `/api/group/${groupId}/session/${sessionId}/round/${roundId}/participation`,
      z.array(RoundParticipation), // array für eine Runde
      fetch
    );

    // RoundCall
    //api/group/[group]/session/[session]/round/[round]/call
    const call = await get(
      `/api/group/${groupId}/session/${sessionId}/round/${roundId}/call`,
      z.array(RoundCall),
      fetch
    );

    // RoundBonus
    //api/group/[group]/session/[session]/round/[round]/bonus
    const bonus = await get(
      `/api/group/${groupId}/session/${sessionId}/round/${roundId}/bonus`,
      z.array(RoundBonus),
      fetch
    );

    result.push({
      // Array über alle Runden
      round,
      roundId,
      participation,
      call,
      bonus,
    });
  }

  return {
    session,
    sessionId,
    groupId,
    groupMembers,
    sessionMembers,
    rounds: result,
    totalPointsByMemberId, // TODO: pointsByMemberId anstatt die Gesamtpunktzahl
  };
};
