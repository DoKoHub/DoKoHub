import { api } from '../setup/+api';
import { setupDatabase } from '../setup/+setup';
import { db } from '$lib/server/db';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { Sql } from 'postgres';

// Mock data
const MOCK_PLAYER_DATA_FULL = {
  provider: "GOOGLE",
  subject: "round-test-subject",
  email: "round.test@example.com",
};

const MOCK_SESSION_DATA = {
  ruleset: "STANDARD",
  plannedRounds: 10,
  startedAt: new Date().toISOString(),
};

const MOCK_ROUND_DATA_WIN_RE = {
  roundNum: 1,
  gameType: "NORMAL",
  eyesRe: 150, 
};

afterAll(async () => {
  const rawClient = (db as PostgresJsDatabase<any> & { $client: Sql<any> })
    .$client;

  if (rawClient && rawClient.end) {
    await rawClient.end();
  }
});

/**
 * Erstellt die notwendige Umgebung (Gruppe, Session, Mitglieder)
 * und vier Spieler für ein 4er-Spiel.
 * @returns {Promise<object>} Objekt mit IDs der erstellten Entitäten und Mitglieder.
 */
async function setupFourPlayerEnvironment() {
  await setupDatabase();

  const creatorResp = await api.post("/api/player", {
    name: "Creator",
    ...MOCK_PLAYER_DATA_FULL,
  });
  const creatorPlayerId: string = creatorResp.body.player.id;

  const groupResp = await api.post("/api/group", {
    name: "ResultTestGroup",
    creatorId: creatorPlayerId,
  });
  const groupId: string = groupResp.body.playGroup.id;

  const createPlayerAndMember = async (name: string, seatPos: number) => {
    const playerResp = await api.post("/api/player", {
      name: name,
      ...MOCK_PLAYER_DATA_FULL,
    });
    const playerId = playerResp.body.player.id;

    const memberResp = await api.post(`/api/group/${groupId}/member`, {
      playerId: playerId,
    });
    const memberId = memberResp.body.playGroupMember.id;

    return { playerId, memberId, seatPos };
  };
  
  // Spieler 1 (Sitz 1)
  const creatorMember = (await api.get(`/api/group/${groupId}/member`)).body.find(
    (m: any) => m.playerId === creatorPlayerId
  );
  const p1MemberId: string = creatorMember.id;
  const p1PlayerId: string = creatorPlayerId;
  const p1SeatPos = 1;

  // 3 weitere Spieler
  const p2 = await createPlayerAndMember("Player 2", 2);
  const p3 = await createPlayerAndMember("Player 3", 3);
  const p4 = await createPlayerAndMember("Player 4", 4);

  const sessionResp = await api.post(
    `/api/group/${groupId}/session`,
    MOCK_SESSION_DATA
  );
  const sessionId: string = sessionResp.body.session.id;
  
  // Alle Spieler in die Session hinzufügen
  await api.post(`/api/group/${groupId}/session/${sessionId}/sessionmember`, { memberId: p1MemberId, seatPos: p1SeatPos });
  await api.post(`/api/group/${groupId}/session/${sessionId}/sessionmember`, { memberId: p2.memberId, seatPos: p2.seatPos });
  await api.post(`/api/group/${groupId}/session/${sessionId}/sessionmember`, { memberId: p3.memberId, seatPos: p3.seatPos });
  await api.post(`/api/group/${groupId}/session/${sessionId}/sessionmember`, { memberId: p4.memberId, seatPos: p4.seatPos });
  
  return {
    groupId,
    sessionId,
    p1: { memberId: p1MemberId, playerId: p1PlayerId, name: 'Creator', seatPos: p1SeatPos },
    p2,
    p3,
    p4,
    allMembers: [
        { memberId: p1MemberId, playerId: p1PlayerId, name: 'Creator', seatPos: p1SeatPos },
        { memberId: p2.memberId, playerId: p2.playerId, name: 'Player 2', seatPos: p2.seatPos },
        { memberId: p3.memberId, playerId: p3.playerId, name: 'Player 3', seatPos: p3.seatPos },
        { memberId: p4.memberId, playerId: p4.playerId, name: 'Player 4', seatPos: p4.seatPos },
    ]
  };
}

// Tests für /api/group/[group]/session/[session]/result (GET)
describe("API /api/group/[group]/session/[session]/result (Session Results TSR 7.2.2(a))", () => {
  let groupId: string;
  let sessionId: string;
  let env: Awaited<ReturnType<typeof setupFourPlayerEnvironment>>;

  beforeEach(async () => {
    env = await setupFourPlayerEnvironment();
    ({ groupId, sessionId } = env);
  });

  // Test: Einfaches Normalspiel mit Re-Sieg
  test("GET: Should correctly calculate points for a basic 'NORMAL' game won by RE (150:90) with no calls/bonuses (Status 200)", async () => {
    const roundResp = await api.post(
      `/api/group/${groupId}/session/${sessionId}/round`,
      MOCK_ROUND_DATA_WIN_RE
    );
    const roundId: string = roundResp.body.round.id;
    
    await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/participation`, { memberId: env.p1.memberId, side: 'RE' });
    await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/participation`, { memberId: env.p2.memberId, side: 'RE' });

    await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/participation`, { memberId: env.p3.memberId, side: 'KONTRA' });
    await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/participation`, { memberId: env.p4.memberId, side: 'KONTRA' });
    
    const response = await api.get(
      `/api/group/${groupId}/session/${sessionId}/result`
    );

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Session results calculated successfully.");
    expect(Array.isArray(response.body.sessionResults)).toBe(true);
    expect(response.body.sessionResults.length).toBe(4);

    // Ergebnisse Überprüfen
    const results = response.body.sessionResults;
    const reMembers = [env.p1.memberId, env.p2.memberId];
    const kontraMembers = [env.p3.memberId, env.p4.memberId];
    
    // RE-Spieler (jeder sollte 1 Punkt haben)
    for (const memberId of reMembers) {
        const result = results.find((r: any) => r.member_id === memberId);
        expect(result).toBeDefined();
        expect(result.points).toBe(1);
    }
    
    // KONTRA-Spieler (jeder sollte -1 Punkt haben)
    for (const memberId of kontraMembers) {
        const result = results.find((r: any) => r.member_id === memberId);
        expect(result).toBeDefined();
        expect(result.points).toBe(-1);
    }
  });
});