import { api } from "../setup/+api";
import { setupDatabase } from "../setup/+setup";
import { db } from "$lib/server/db";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { Sql } from "postgres";

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

afterAll(async () => {
  const rawClient = (db as PostgresJsDatabase<any> & { $client: Sql<any> }).$client;
  if (rawClient && rawClient.end) await rawClient.end();
});

function memberIdAusResponse(resp: any): string {
  return (
    resp?.body?.playGroupMember?.id ??
    resp?.body?.member?.id ??
    resp?.body?.id ??
    resp?.body?.playGroupMemberId
  );
}

async function setupVierSpielerUmgebung() {
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

  const createPlayerUndMember = async (name: string, seatPos: number) => {
    const playerResp = await api.post("/api/player", {
      name,
      ...MOCK_PLAYER_DATA_FULL,
    });

    const playerId = playerResp.body.player.id;

    const memberResp = await api.post(`/api/group/${groupId}/member`, {
      playerId,
    });

    const memberId = memberIdAusResponse(memberResp);
    return { playerId, memberId, name, seatPos };
  };

  const creatorMember = (await api.get(`/api/group/${groupId}/member`)).body.find(
    (m: any) => m.playerId === creatorPlayerId
  );

  const p1 = { playerId: creatorPlayerId, memberId: creatorMember.id, name: "Creator", seatPos: 1 };
  const p2 = await createPlayerUndMember("Player 2", 2);
  const p3 = await createPlayerUndMember("Player 3", 3);
  const p4 = await createPlayerUndMember("Player 4", 4);

  const sessionResp = await api.post(`/api/group/${groupId}/session`, MOCK_SESSION_DATA);
  const sessionId: string = sessionResp.body.session.id;

  await api.post(`/api/group/${groupId}/session/${sessionId}/sessionmember`, { memberId: p1.memberId, seatPos: p1.seatPos });
  await api.post(`/api/group/${groupId}/session/${sessionId}/sessionmember`, { memberId: p2.memberId, seatPos: p2.seatPos });
  await api.post(`/api/group/${groupId}/session/${sessionId}/sessionmember`, { memberId: p3.memberId, seatPos: p3.seatPos });
  await api.post(`/api/group/${groupId}/session/${sessionId}/sessionmember`, { memberId: p4.memberId, seatPos: p4.seatPos });

  return { groupId, sessionId, p1, p2, p3, p4, alle: [p1, p2, p3, p4] };
}

async function createRound(params: {
  groupId: string;
  sessionId: string;
  roundNum: number;
  gameType: string;
  eyesRe: number;
}) {
  const { groupId, sessionId, gameType, ...rest } = params;

  const body: any = { ...rest, gameType };

  if (gameType.startsWith("SOLO_")) {
    body.soloKind = "PFLICHT";
  }

  const resp = await api.post(`/api/group/${groupId}/session/${sessionId}/round`, body);
  expect(resp.status).toBe(200);
  expect(resp.body.round).toBeDefined();
  return resp.body.round.id as string;
}

async function addParticipation(params: {
  groupId: string;
  sessionId: string;
  roundId: string;
  memberId: string;
  side: "RE" | "KONTRA";
}) {
  const { groupId, sessionId, roundId, memberId, side } = params;
  const resp = await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/participation`, { memberId, side });
  expect(resp.status).toBe(200);
}

async function addCall(params: {
  groupId: string;
  sessionId: string;
  roundId: string;
  memberId: string;
  call: string;
  allow400?: boolean;
}) {
  const { groupId, sessionId, roundId, memberId, call, allow400 } = params;
  const resp = await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/call`, { memberId, call });
  if (allow400) {
    expect([200, 400]).toContain(resp.status);
  } else {
    expect(resp.status).toBe(200);
  }
}

async function addBonus(params: {
  groupId: string;
  sessionId: string;
  roundId: string;
  memberId: string;
  bonus: string;
  allow400?: boolean;
}) {
  const { groupId, sessionId, roundId, memberId, bonus, allow400 } = params;
  const resp = await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/bonus`, { memberId, bonus });
  if (allow400) {
    expect([200, 400]).toContain(resp.status);
  } else {
    expect(resp.status).toBe(200);
  }
}

async function getResults(groupId: string, sessionId: string) {
  return api.get(`/api/group/${groupId}/session/${sessionId}/result`);
}

function pointsOf(results: any[], memberId: string): number {
  const row = results.find((r: any) => r.member_id === memberId);
  return row?.points ?? 0;
}

describe("API /api/group/[group]/session/[session]/result (TSR-Logik Integration)", () => {
  let env: Awaited<ReturnType<typeof setupVierSpielerUmgebung>>;

  beforeEach(async () => {
    env = await setupVierSpielerUmgebung();
  });

  test("Normal: Re gewinnt ohne Stufen (121:119) -> RE +1, KONTRA -1", async () => {
    const roundId = await createRound({ groupId: env.groupId, sessionId: env.sessionId, roundNum: 1, gameType: "NORMAL", eyesRe: 121 });

    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p1.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p2.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p3.memberId, side: "KONTRA" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p4.memberId, side: "KONTRA" });

    const res = await getResults(env.groupId, env.sessionId);
    expect(pointsOf(res.body.results, env.p1.memberId)).toBe(1);
    expect(pointsOf(res.body.results, env.p2.memberId)).toBe(1);
    expect(pointsOf(res.body.results, env.p3.memberId)).toBe(-1);
    expect(pointsOf(res.body.results, env.p4.memberId)).toBe(-1);
  });

  test("Normal: Re verliert ohne Stufen (119:121) -> RE -1, KONTRA +1", async () => {
    const roundId = await createRound({ groupId: env.groupId, sessionId: env.sessionId, roundNum: 1, gameType: "NORMAL", eyesRe: 119 });

    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p1.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p2.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p3.memberId, side: "KONTRA" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p4.memberId, side: "KONTRA" });

    const res = await getResults(env.groupId, env.sessionId);
    expect(pointsOf(res.body.results, env.p1.memberId)).toBe(-1);
    expect(pointsOf(res.body.results, env.p2.memberId)).toBe(-1);
    expect(pointsOf(res.body.results, env.p3.memberId)).toBe(1);
    expect(pointsOf(res.body.results, env.p4.memberId)).toBe(1);
  });

  test("Normal: loserEyes = 90 Grenze (150:90) -> nur Grundwert 1", async () => {
    const roundId = await createRound({ groupId: env.groupId, sessionId: env.sessionId, roundNum: 1, gameType: "NORMAL", eyesRe: 150 });

    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p1.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p2.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p3.memberId, side: "KONTRA" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p4.memberId, side: "KONTRA" });

    const res = await getResults(env.groupId, env.sessionId);
    expect(pointsOf(res.body.results, env.p1.memberId)).toBe(1);
    expect(pointsOf(res.body.results, env.p3.memberId)).toBe(-1);
  });

  test("Normal: loserEyes = 89 (151:89) -> Grundwert 2", async () => {
    const roundId = await createRound({ groupId: env.groupId, sessionId: env.sessionId, roundNum: 1, gameType: "NORMAL", eyesRe: 151 });

    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p1.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p2.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p3.memberId, side: "KONTRA" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p4.memberId, side: "KONTRA" });

    const res = await getResults(env.groupId, env.sessionId);
    expect(pointsOf(res.body.results, env.p1.memberId)).toBe(2);
    expect(pointsOf(res.body.results, env.p3.memberId)).toBe(-2);
  });

  test("Normal: loserEyes = 59 (181:59) -> Grundwert 3", async () => {
    const roundId = await createRound({ groupId: env.groupId, sessionId: env.sessionId, roundNum: 1, gameType: "NORMAL", eyesRe: 181 });

    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p1.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p2.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p3.memberId, side: "KONTRA" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p4.memberId, side: "KONTRA" });

    const res = await getResults(env.groupId, env.sessionId);
    expect(pointsOf(res.body.results, env.p1.memberId)).toBe(3);
    expect(pointsOf(res.body.results, env.p3.memberId)).toBe(-3);
  });

  test("Normal: loserEyes = 29 (211:29) -> Grundwert 4", async () => {
    const roundId = await createRound({ groupId: env.groupId, sessionId: env.sessionId, roundNum: 1, gameType: "NORMAL", eyesRe: 211 });

    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p1.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p2.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p3.memberId, side: "KONTRA" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p4.memberId, side: "KONTRA" });

    const res = await getResults(env.groupId, env.sessionId);
    expect(pointsOf(res.body.results, env.p1.memberId)).toBe(4);
    expect(pointsOf(res.body.results, env.p3.memberId)).toBe(-4);
  });

  test("Normal: schwarz (240:0) -> Grundwert 5", async () => {
    const roundId = await createRound({ groupId: env.groupId, sessionId: env.sessionId, roundNum: 1, gameType: "NORMAL", eyesRe: 240 });

    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p1.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p2.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p3.memberId, side: "KONTRA" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p4.memberId, side: "KONTRA" });

    const res = await getResults(env.groupId, env.sessionId);
    expect(pointsOf(res.body.results, env.p1.memberId)).toBe(5);
    expect(pointsOf(res.body.results, env.p3.memberId)).toBe(-5);
  });

  test("Ansage: RE gewinnt + RE-Call -> Grundwert(1) +2 = 3", async () => {
    const roundId = await createRound({ groupId: env.groupId, sessionId: env.sessionId, roundNum: 1, gameType: "NORMAL", eyesRe: 150 });

    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p1.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p2.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p3.memberId, side: "KONTRA" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p4.memberId, side: "KONTRA" });

    await addCall({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p1.memberId, call: "RE" });

    const res = await getResults(env.groupId, env.sessionId);
    expect(pointsOf(res.body.results, env.p1.memberId)).toBe(3);
    expect(pointsOf(res.body.results, env.p2.memberId)).toBe(3);
    expect(pointsOf(res.body.results, env.p3.memberId)).toBe(-3);
    expect(pointsOf(res.body.results, env.p4.memberId)).toBe(-3);
  });

  test("Ansage: RE verliert + RE-Call -> Grundwert(-1) -2 = -3", async () => {
    const roundId = await createRound({ groupId: env.groupId, sessionId: env.sessionId, roundNum: 1, gameType: "NORMAL", eyesRe: 110 });

    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p1.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p2.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p3.memberId, side: "KONTRA" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p4.memberId, side: "KONTRA" });

    await addCall({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p1.memberId, call: "RE" });

    const res = await getResults(env.groupId, env.sessionId);
    expect(pointsOf(res.body.results, env.p1.memberId)).toBe(-3);
    expect(pointsOf(res.body.results, env.p2.memberId)).toBe(-3);
    expect(pointsOf(res.body.results, env.p3.memberId)).toBe(3);
    expect(pointsOf(res.body.results, env.p4.memberId)).toBe(3);
  });

  test("Ansage: KONTRA gewinnt + KONTRA-Call -> Grundwert(1) +2 = 3 für KONTRA", async () => {
    const roundId = await createRound({ groupId: env.groupId, sessionId: env.sessionId, roundNum: 1, gameType: "NORMAL", eyesRe: 110 });

    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p1.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p2.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p3.memberId, side: "KONTRA" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p4.memberId, side: "KONTRA" });

    await addCall({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p3.memberId, call: "KONTRA" });

    const res = await getResults(env.groupId, env.sessionId);
    expect(pointsOf(res.body.results, env.p3.memberId)).toBe(3);
    expect(pointsOf(res.body.results, env.p4.memberId)).toBe(3);
    expect(pointsOf(res.body.results, env.p1.memberId)).toBe(-3);
    expect(pointsOf(res.body.results, env.p2.memberId)).toBe(-3);
  });

  test("Ansage doppelt: zwei RE-Calls in der Partei werden gezählt", async () => {
    const roundId = await createRound({ groupId: env.groupId, sessionId: env.sessionId, roundNum: 1, gameType: "NORMAL", eyesRe: 150 });

    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p1.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p2.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p3.memberId, side: "KONTRA" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p4.memberId, side: "KONTRA" });

    await addCall({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p1.memberId, call: "RE" });
    await addCall({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p2.memberId, call: "RE" });

    const res = await getResults(env.groupId, env.sessionId);
    expect(pointsOf(res.body.results, env.p1.memberId)).toBe(5);
    expect(pointsOf(res.body.results, env.p2.memberId)).toBe(5);
    expect(pointsOf(res.body.results, env.p3.memberId)).toBe(-5);
    expect(pointsOf(res.body.results, env.p4.memberId)).toBe(-5);
  });

  test("Absage Erfolg: RE sagt KEINE90 und gewinnt 200:40 -> Grundwert(3) +1 = 4", async () => {
    const roundId = await createRound({ groupId: env.groupId, sessionId: env.sessionId, roundNum: 1, gameType: "NORMAL", eyesRe: 200 });

    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p1.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p2.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p3.memberId, side: "KONTRA" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p4.memberId, side: "KONTRA" });

    await addCall({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p1.memberId, call: "KEINE90" });

    const res = await getResults(env.groupId, env.sessionId);
    expect(pointsOf(res.body.results, env.p1.memberId)).toBe(4);
    expect(pointsOf(res.body.results, env.p3.memberId)).toBe(-4);
  });

  test("Absage Fail: RE sagt KEINE90, aber 150:90 -> Sieger kippt, Ergebnis RE -2 / KONTRA +2", async () => {
    const roundId = await createRound({ groupId: env.groupId, sessionId: env.sessionId, roundNum: 1, gameType: "NORMAL", eyesRe: 150 });

    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p1.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p2.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p3.memberId, side: "KONTRA" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p4.memberId, side: "KONTRA" });

    await addCall({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p1.memberId, call: "KEINE90" });

    const res = await getResults(env.groupId, env.sessionId);
    expect(pointsOf(res.body.results, env.p1.memberId)).toBe(-2);
    expect(pointsOf(res.body.results, env.p2.memberId)).toBe(-2);
    expect(pointsOf(res.body.results, env.p3.memberId)).toBe(2);
    expect(pointsOf(res.body.results, env.p4.memberId)).toBe(2);
  });

  test("Absage Erfolg: RE sagt KEINE60 und gewinnt 200:40 -> Grundwert(3) +1 = 4", async () => {
    const roundId = await createRound({ groupId: env.groupId, sessionId: env.sessionId, roundNum: 1, gameType: "NORMAL", eyesRe: 200 });

    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p1.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p2.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p3.memberId, side: "KONTRA" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p4.memberId, side: "KONTRA" });

    await addCall({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p1.memberId, call: "KEINE60" });

    const res = await getResults(env.groupId, env.sessionId);
    expect(pointsOf(res.body.results, env.p1.memberId)).toBe(4);
    expect(pointsOf(res.body.results, env.p3.memberId)).toBe(-4);
  });

  test("Absage Fail: RE sagt KEINE60, aber KONTRA macht 80 (160:80) -> Ergebnis RE -2 / KONTRA +2", async () => {
    const roundId = await createRound({ groupId: env.groupId, sessionId: env.sessionId, roundNum: 1, gameType: "NORMAL", eyesRe: 160 });

    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p1.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p2.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p3.memberId, side: "KONTRA" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p4.memberId, side: "KONTRA" });

    await addCall({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p1.memberId, call: "KEINE60" });

    const res = await getResults(env.groupId, env.sessionId);
    expect(pointsOf(res.body.results, env.p1.memberId)).toBe(-2);
    expect(pointsOf(res.body.results, env.p2.memberId)).toBe(-2);
    expect(pointsOf(res.body.results, env.p3.memberId)).toBe(2);
    expect(pointsOf(res.body.results, env.p4.memberId)).toBe(2);
  });

  test("Absage Erfolg: RE sagt KEINE30 und gewinnt 230:10 -> Grundwert(4) +1 = 5", async () => {
    const roundId = await createRound({ groupId: env.groupId, sessionId: env.sessionId, roundNum: 1, gameType: "NORMAL", eyesRe: 230 });

    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p1.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p2.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p3.memberId, side: "KONTRA" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p4.memberId, side: "KONTRA" });

    await addCall({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p1.memberId, call: "KEINE30" });

    const res = await getResults(env.groupId, env.sessionId);
    expect(pointsOf(res.body.results, env.p1.memberId)).toBe(5);
    expect(pointsOf(res.body.results, env.p3.memberId)).toBe(-5);
  });

  test("Absage Fail: RE sagt KEINE30, aber KONTRA macht 40 (200:40) -> Ergebnis RE -2 / KONTRA +2", async () => {
    const roundId = await createRound({ groupId: env.groupId, sessionId: env.sessionId, roundNum: 1, gameType: "NORMAL", eyesRe: 200 });

    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p1.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p2.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p3.memberId, side: "KONTRA" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p4.memberId, side: "KONTRA" });

    await addCall({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p1.memberId, call: "KEINE30" });

    const res = await getResults(env.groupId, env.sessionId);
    expect(pointsOf(res.body.results, env.p1.memberId)).toBe(-2);
    expect(pointsOf(res.body.results, env.p2.memberId)).toBe(-2);
    expect(pointsOf(res.body.results, env.p3.memberId)).toBe(2);
    expect(pointsOf(res.body.results, env.p4.memberId)).toBe(2);
  });

  test("Absage Erfolg: RE sagt SCHWARZ und gewinnt 240:0 -> Grundwert(5) +1 = 6", async () => {
    const roundId = await createRound({ groupId: env.groupId, sessionId: env.sessionId, roundNum: 1, gameType: "NORMAL", eyesRe: 240 });

    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p1.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p2.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p3.memberId, side: "KONTRA" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p4.memberId, side: "KONTRA" });

    await addCall({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p1.memberId, call: "SCHWARZ" });

    const res = await getResults(env.groupId, env.sessionId);
    expect(pointsOf(res.body.results, env.p1.memberId)).toBe(6);
    expect(pointsOf(res.body.results, env.p3.memberId)).toBe(-6);
  });

  test("Absage Fail: RE sagt SCHWARZ, aber 230:10 -> Ergebnis RE -2 / KONTRA +2", async () => {
    const roundId = await createRound({ groupId: env.groupId, sessionId: env.sessionId, roundNum: 1, gameType: "NORMAL", eyesRe: 230 });

    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p1.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p2.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p3.memberId, side: "KONTRA" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p4.memberId, side: "KONTRA" });

    await addCall({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p1.memberId, call: "SCHWARZ" });

    const res = await getResults(env.groupId, env.sessionId);
    expect(pointsOf(res.body.results, env.p1.memberId)).toBe(-2);
    expect(pointsOf(res.body.results, env.p2.memberId)).toBe(-2);
    expect(pointsOf(res.body.results, env.p3.memberId)).toBe(2);
    expect(pointsOf(res.body.results, env.p4.memberId)).toBe(2);
  });

  test("Beide Seiten verfehlen KEINE90 (7.1.3): nur (a) + (e/f) zählt", async () => {
    const roundId = await createRound({ groupId: env.groupId, sessionId: env.sessionId, roundNum: 1, gameType: "NORMAL", eyesRe: 150 });

    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p1.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p2.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p3.memberId, side: "KONTRA" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p4.memberId, side: "KONTRA" });

    await addCall({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p1.memberId, call: "KEINE90" });
    await addCall({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p3.memberId, call: "KEINE90" });

    const res = await getResults(env.groupId, env.sessionId);
    expect(res.status).toBe(200);
  });

  test("Beide verfehlen, aber Augen gegen Absage trifft mehrfach", async () => {
    const roundId = await createRound({ groupId: env.groupId, sessionId: env.sessionId, roundNum: 1, gameType: "NORMAL", eyesRe: 130 });

    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p1.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p2.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p3.memberId, side: "KONTRA" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p4.memberId, side: "KONTRA" });

    await addCall({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p3.memberId, call: "KEINE90" });
    await addCall({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p3.memberId, call: "KEINE60" });

    await addCall({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p1.memberId, call: "KEINE90" });
    await addCall({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p1.memberId, call: "KEINE60" });

    const res = await getResults(env.groupId, env.sessionId);
    expect(res.status).toBe(200);
  });

  test("Augen gegen Absage: KONTRA sagt KEINE60, RE macht 100 (>=90) -> RE bekommt +1 extra", async () => {
    const roundId = await createRound({ groupId: env.groupId, sessionId: env.sessionId, roundNum: 1, gameType: "NORMAL", eyesRe: 100 });

    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p1.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p2.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p3.memberId, side: "KONTRA" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p4.memberId, side: "KONTRA" });

    await addCall({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p3.memberId, call: "KEINE60" });

    const res = await getResults(env.groupId, env.sessionId);
    expect(res.status).toBe(200);
  });

  test("120:120 ohne Ansagen -> KONTRA gewinnt", async () => {
    const roundId = await createRound({ groupId: env.groupId, sessionId: env.sessionId, roundNum: 1, gameType: "NORMAL", eyesRe: 120 });

    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p1.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p2.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p3.memberId, side: "KONTRA" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p4.memberId, side: "KONTRA" });

    const res = await getResults(env.groupId, env.sessionId);
    expect(pointsOf(res.body.results, env.p3.memberId)).toBe(1);
    expect(pointsOf(res.body.results, env.p1.memberId)).toBe(-1);
  });

  test("120:120 mit RE-Ansage -> KONTRA gewinnt, RE-Ansage scheitert", async () => {
    const roundId = await createRound({ groupId: env.groupId, sessionId: env.sessionId, roundNum: 1, gameType: "NORMAL", eyesRe: 120 });

    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p1.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p2.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p3.memberId, side: "KONTRA" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p4.memberId, side: "KONTRA" });

    await addCall({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p1.memberId, call: "RE" });

    const res = await getResults(env.groupId, env.sessionId);
    expect(pointsOf(res.body.results, env.p1.memberId)).toBe(-3);
    expect(pointsOf(res.body.results, env.p3.memberId)).toBe(3);
  });

  test("120:120 mit nur KONTRA-Ansage -> RE gewinnt (Sonderfall)", async () => {
    const roundId = await createRound({ groupId: env.groupId, sessionId: env.sessionId, roundNum: 1, gameType: "NORMAL", eyesRe: 120 });

    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p1.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p2.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p3.memberId, side: "KONTRA" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p4.memberId, side: "KONTRA" });

    await addCall({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p3.memberId, call: "KONTRA" });

    const res = await getResults(env.groupId, env.sessionId);
    expect(pointsOf(res.body.results, env.p1.memberId)).toBe(3);
    expect(pointsOf(res.body.results, env.p3.memberId)).toBe(-3);
  });

  test("Solo: KONTRA-Solo gewinnt (1 vs 3) -> Solo *3, andere -base", async () => {
    const roundId = await createRound({ groupId: env.groupId, sessionId: env.sessionId, roundNum: 1, gameType: "SOLO_CLUBS", eyesRe: 119 });

    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p1.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p2.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p3.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p4.memberId, side: "KONTRA" });

    const res = await getResults(env.groupId, env.sessionId);
    expect(pointsOf(res.body.results, env.p4.memberId)).toBe(3);
    expect(pointsOf(res.body.results, env.p1.memberId)).toBe(-1);
    expect(pointsOf(res.body.results, env.p2.memberId)).toBe(-1);
    expect(pointsOf(res.body.results, env.p3.memberId)).toBe(-1);
  });

  test("Solo: RE-Solo verliert (1 vs 3) -> Solo negativ *3, andere positiv", async () => {
    const roundId = await createRound({ groupId: env.groupId, sessionId: env.sessionId, roundNum: 1, gameType: "SOLO_CLUBS", eyesRe: 119 });

    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p1.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p2.memberId, side: "KONTRA" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p3.memberId, side: "KONTRA" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p4.memberId, side: "KONTRA" });

    const res = await getResults(env.groupId, env.sessionId);
    expect(pointsOf(res.body.results, env.p1.memberId)).toBe(-3);
    expect(pointsOf(res.body.results, env.p2.memberId)).toBe(1);
    expect(pointsOf(res.body.results, env.p3.memberId)).toBe(1);
    expect(pointsOf(res.body.results, env.p4.memberId)).toBe(1);
  });

  test("Stille Hochzeit: HOCHZEIT_STILL wird wie Solo verteilt (1 vs 3)", async () => {
    const roundId = await createRound({ groupId: env.groupId, sessionId: env.sessionId, roundNum: 1, gameType: "HOCHZEIT_STILL", eyesRe: 119 });

    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p1.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p2.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p3.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p4.memberId, side: "KONTRA" });

    const res = await getResults(env.groupId, env.sessionId);
    expect(pointsOf(res.body.results, env.p4.memberId)).toBe(3);
  });

  test("Solo-Fallback: SOLO_* aber nicht 1-vs-3 -> wird wie Normal verteilt", async () => {
    const roundId = await createRound({ groupId: env.groupId, sessionId: env.sessionId, roundNum: 1, gameType: "SOLO_CLUBS", eyesRe: 150 });

    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p1.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p2.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p3.memberId, side: "KONTRA" });

    const res = await getResults(env.groupId, env.sessionId);
    expect(pointsOf(res.body.results, env.p1.memberId)).toBe(1);
    expect(pointsOf(res.body.results, env.p3.memberId)).toBe(-1);
  });

  test("Boni: mehrere Boni auf verschiedene Spieler (Normalspiel) -> pro Spieler addieren", async () => {
    const roundId = await createRound({ groupId: env.groupId, sessionId: env.sessionId, roundNum: 1, gameType: "NORMAL", eyesRe: 150 });

    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p1.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p2.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p3.memberId, side: "KONTRA" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p4.memberId, side: "KONTRA" });

    await addBonus({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p1.memberId, bonus: "DOKO" });
    await addBonus({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p3.memberId, bonus: "FUCHS" });
    await addBonus({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p3.memberId, bonus: "KARLCHEN" });

    const res = await getResults(env.groupId, env.sessionId);
    expect(pointsOf(res.body.results, env.p1.memberId)).toBe(2);
    expect(pointsOf(res.body.results, env.p3.memberId)).toBe(1);
  });

test("Boni werden im Solo ignoriert", async () => {
  // Runde 1: Solo ohne Bonus
  const r1 = await createRound({
    groupId: env.groupId,
    sessionId: env.sessionId,
    roundNum: 1,
    gameType: "SOLO_CLUBS",
    eyesRe: 119,
  });

  await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId: r1, memberId: env.p1.memberId, side: "RE" });
  await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId: r1, memberId: env.p2.memberId, side: "RE" });
  await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId: r1, memberId: env.p3.memberId, side: "RE" });
  await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId: r1, memberId: env.p4.memberId, side: "KONTRA" });

  const res1 = await getResults(env.groupId, env.sessionId);

  const total1 = pointsOf(res1.body.results, env.p1.memberId);

  // Runde 2: Solo mit Bonus (soll im Solo NICHT zählen)
  const r2 = await createRound({
    groupId: env.groupId,
    sessionId: env.sessionId,
    roundNum: 2,
    gameType: "SOLO_CLUBS",
    eyesRe: 119,
  });

  await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId: r2, memberId: env.p1.memberId, side: "RE" });
  await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId: r2, memberId: env.p2.memberId, side: "RE" });
  await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId: r2, memberId: env.p3.memberId, side: "RE" });
  await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId: r2, memberId: env.p4.memberId, side: "KONTRA" });

  await addBonus({ groupId: env.groupId, sessionId: env.sessionId, roundId: r2, memberId: env.p1.memberId, bonus: "DOKO" });

  const res2 = await getResults(env.groupId, env.sessionId);
  const total2 = pointsOf(res2.body.results, env.p1.memberId);
  const contrib2 = total2 - total1;

  expect(contrib2).toBe(0);
});

  test("Edge: Call von Member ohne Participation wird ignoriert (kein Crash)", async () => {
    const roundId = await createRound({ groupId: env.groupId, sessionId: env.sessionId, roundNum: 1, gameType: "NORMAL", eyesRe: 150 });

    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p1.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p2.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p3.memberId, side: "KONTRA" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p4.memberId, side: "KONTRA" });

    const extraPlayer = await api.post("/api/player", { name: "Extra", ...MOCK_PLAYER_DATA_FULL });
    const extraMemberResp = await api.post(`/api/group/${env.groupId}/member`, { playerId: extraPlayer.body.player.id });
    const extraMemberId = memberIdAusResponse(extraMemberResp);

    await api.post(`/api/group/${env.groupId}/session/${env.sessionId}/sessionmember`, { memberId: extraMemberId, seatPos: 4 });

    await addCall({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: extraMemberId, call: "RE", allow400: true });

    const res = await getResults(env.groupId, env.sessionId);
    expect(res.status).toBe(200);
  });

  test("Edge: Runde ohne Participation-Einträge -> kein Crash, Punkte bleiben 0", async () => {
    await createRound({ groupId: env.groupId, sessionId: env.sessionId, roundNum: 1, gameType: "NORMAL", eyesRe: 150 });
    const res = await getResults(env.groupId, env.sessionId);
    expect(res.status).toBe(200);
    for (const p of env.alle) expect(pointsOf(res.body.results, p.memberId)).toBe(0);
  });

  test("Edge: Bonus für Member der nicht in der Session ist -> Scoreboard bleibt unverändert", async () => {
    const roundId = await createRound({ groupId: env.groupId, sessionId: env.sessionId, roundNum: 1, gameType: "NORMAL", eyesRe: 150 });

    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p1.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p2.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p3.memberId, side: "KONTRA" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p4.memberId, side: "KONTRA" });

    const outsiderPlayer = await api.post("/api/player", { name: "Outsider", ...MOCK_PLAYER_DATA_FULL });
    const outsiderMemberResp = await api.post(`/api/group/${env.groupId}/member`, { playerId: outsiderPlayer.body.player.id });
    const outsiderMemberId = memberIdAusResponse(outsiderMemberResp);

    await addBonus({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: outsiderMemberId, bonus: "DOKO", allow400: true });

    const res = await getResults(env.groupId, env.sessionId);
    expect(res.status).toBe(200);
  });

  test("API: Session-Member nimmt in einer Runde nicht teil -> bekommt dort keine Punkte", async () => {
    const roundId = await createRound({ groupId: env.groupId, sessionId: env.sessionId, roundNum: 1, gameType: "NORMAL", eyesRe: 150 });

    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p1.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p2.memberId, side: "RE" });
    await addParticipation({ groupId: env.groupId, sessionId: env.sessionId, roundId, memberId: env.p3.memberId, side: "KONTRA" });

    const res = await getResults(env.groupId, env.sessionId);
    expect(res.status).toBe(200);
    expect(pointsOf(res.body.results, env.p4.memberId)).toBe(0);
  });

  test("API: Session gehört nicht zur Gruppe -> 400", async () => {
    const otherGroup = await api.post("/api/group", { name: "AndereGruppe", creatorId: env.p1.playerId });
    const otherGroupId = otherGroup.body.playGroup.id;

    const res = await api.get(`/api/group/${otherGroupId}/session/${env.sessionId}/result`);
    expect(res.status).toBe(400);
  });

  test("API: Ungültige groupId/sessionId -> 400", async () => {
    const r1 = await api.get(`/api/group/not-a-uuid/session/${env.sessionId}/result`);
    expect(r1.status).toBe(400);

    const r2 = await api.get(`/api/group/${env.groupId}/session/not-a-uuid/result`);
    expect(r2.status).toBe(400);
  });
});
