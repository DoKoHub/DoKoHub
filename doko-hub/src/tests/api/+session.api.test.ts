import { api } from "../setup/+api";
import { setupDatabase } from "../setup/+setup";
import { db } from "$lib/server/db";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { Sql } from "postgres";
import { PlayGroup, Session, type Ruleset } from "$lib/types";

// Mock data
const MOCK_SESSION_DATA = {
  ruleset: "STANDARD",
  plannedRounds: 42,
  startedAt: new Date().toISOString(),
};

const MOCK_PLAYER_DATA_FULL = {
  provider: "GOOGLE",
  subject: "session-test-subject",
  email: "session.test@example.com",
};

const MOCK_PLAYER_DATA_FULL2 = {
  provider: "GOOGLE",
  subject: "session-test-subject",
  email: "session.test@example.com",
};

afterAll(async () => {
  const rawClient = (db as PostgresJsDatabase<any> & { $client: Sql<any> })
    .$client;

  if (rawClient && rawClient.end) {
    await rawClient.end();
  }
});

// Tests für /api/group/[group]/session (GET & POST)

describe("API /api/group/[group]/session", () => {
  let groupId: string;
  let playerId: string;

  beforeEach(async () => {
    await setupDatabase();

    const playerResp = await api.post("/api/player", {
      name: "Creator1",
      ...MOCK_PLAYER_DATA_FULL,
    });
    playerId = playerResp.body.player.id;

    const groupResp = await api.post("/api/group", {
      name: "SessionTestGroup",
      creatorId: playerId,
    });
    groupId = groupResp.body.playGroup.id;

    await api.post(`/api/group/${groupId}/member`, { playerId: playerId });
  });

  // Test: POST (Erfolgreiches Erstellen einer neuen Session)
  test("POST: Should successfully create a new Session (Status 201)", async () => {
    const response = await api.post(
      `/api/group/${groupId}/session`,
      MOCK_SESSION_DATA
    );

    expect(response.status).toBe(201);
    expect(response.body.message).toBe("Created Session");
    expect(response.body.session.ruleset).toBe(MOCK_SESSION_DATA.ruleset);
    expect(response.body.session.plannedRounds).toBe(
      MOCK_SESSION_DATA.plannedRounds
    );
    expect(response.body.session.groupId).toBe(groupId);
    expect(response.body.session.endedAt).toBeNull();
  });

  // Test: POST (Validierung - ruleset/plannedRounds fehlt)
  test("POST: Should fail if required fields (ruleset/plannedRounds) are missing (Status 400)", async () => {
    let response = await api.post(`/api/group/${groupId}/session`, {});
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("issues");

    response = await api.post(`/api/group/${groupId}/session`, {
      plannedRounds: 10,
    });
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("issues");
  });

  // Test: GET (Leere Liste)
  test("GET: Should return an empty array if no sessions exist (Status 200)", async () => {
    const response = await api.get(`/api/group/${groupId}/session`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  // Test: GET (Liste mit angelegten Sessions)
  test("GET: Should return a list with existing sessions (Status 200)", async () => {
    await api.post(`/api/group/${groupId}/session`, MOCK_SESSION_DATA);
    await api.post(`/api/group/${groupId}/session`, {
      ...MOCK_SESSION_DATA,
      plannedRounds: 10,
    });

    const response = await api.get(`/api/group/${groupId}/session`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(2);
  });

  // Test: GET (Ungültige Gruppen-ID)
  test("GET: Should return 400 if group ID has an invalid format", async () => {
    const response = await api.get("/api/group/not-a-valid-uuid/session");
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message");
  });
});

// Tests für /api/group/[group]/session/[session] (GET, PUT)

describe("API /api/group/[group]/session/[session]", () => {
  let groupId: string;
  let sessionId: string;
  let playerId: string;
  const NON_EXISTENT_ID = "ffffffff-ffff-ffff-ffff-ffffffffffff";
  let initialStartedAt: string;
  let initialRuleset: string;

  beforeEach(async () => {
    await setupDatabase();

    const playerResp = await api.post("/api/player", {
      name: "Creator2",
      ...MOCK_PLAYER_DATA_FULL,
    });
    playerId = playerResp.body.player.id;

    const groupResp = await api.post("/api/group", {
      name: "ManageSessionGroup",
      creatorId: playerId,
    });
    groupId = groupResp.body.playGroup.id;

    await api.post(`/api/group/${groupId}/member`, { playerId: playerId });

    const sessionResp = await api.post(
      `/api/group/${groupId}/session`,
      MOCK_SESSION_DATA
    );
    sessionId = sessionResp.body.session.id;
    initialStartedAt = sessionResp.body.session.startedAt;
    initialRuleset = sessionResp.body.session.ruleset;
  });

  // Test: GET (Abfrage einer spezifischen Session)
  test("GET: Should return the specific Session object (Status 200)", async () => {
    const response = await api.get(
      `/api/group/${groupId}/session/${sessionId}`
    );
    expect(response.status).toBe(200);
    expect(response.body.plannedRounds).toBe(MOCK_SESSION_DATA.plannedRounds);
  });

  // Test: GET (Session existiert nicht)
  test("GET: Should return 400 if session ID is not found", async () => {
    const response = await api.get(
      `/api/group/${groupId}/session/${NON_EXISTENT_ID}`
    );
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message");
  });

  // Test: PUT (Aktualisierung von plannedRounds und endedAt)
  test("PUT: Should successfully update plannedRounds and endedAt (Status 200)", async () => {
    const newRounds = 100;
    const endedDate = new Date();

    const sessionResponse = await api.get(
      `/api/group/${groupId}/session/${sessionId}`
    );
    let session: Session = Session.parse(sessionResponse.body);
    session.plannedRounds = newRounds;
    session.endedAt = endedDate;

    const response = await api.put(
      `/api/group/${groupId}/session/${sessionId}`,
      { session: session }
    );

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Updated Session");
    expect(response.body.session.plannedRounds).toBe(newRounds);
    expect(response.body.session.endedAt).not.toBeNull();
  });

  // Test: PUT (Ungültiges Session-ID-Format)
  test("PUT: Should return 400 if session ID has an invalid format", async () => {
    const response = await api.put(
      `/api/group/${groupId}/session/not-a-valid-uuid`,
      MOCK_SESSION_DATA
    );
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message");
  });
});

// Tests für /api/group/[group]/session/[session]/sessionmember (GET & POST)

describe("API /api/group/[group]/session/[session]/sessionmember", () => {
  let groupId: string;
  let sessionId: string;
  let playerId: string;
  let playerId2: string;
  let memberId1: string;
  let memberId2: string;
  const NON_EXISTENT_ID = "ffffffff-ffff-ffff-ffff-ffffffffffff";

  beforeEach(async () => {
    await setupDatabase();

    const playerResp = await api.post("/api/player", {
      name: "SessionPlayer1",
      ...MOCK_PLAYER_DATA_FULL,
    });
    playerId = playerResp.body.player.id;

    const playerResp2 = await api.post("/api/player", {
      name: "SessionPlayer2",
      ...MOCK_PLAYER_DATA_FULL2,
    });
    playerId2 = playerResp2.body.player.id;

    const groupResp = await api.post("/api/group", {
      name: "SessionMemberGroup",
      creatorId: playerId,
    });
    groupId = groupResp.body.playGroup.id;

    const memberIdResp = await api.get(`/api/group/${groupId}`);
    let groupMember: PlayGroup = PlayGroup.parse(memberIdResp.body);
    memberId1 = groupMember.members[0].id;

    const memberResp = await api.post(`/api/group/${groupId}/member`, {
      playerId: playerId2,
    });
    memberId2 = memberResp.body.playGroupMember.id;

    const sessionResp = await api.post(
      `/api/group/${groupId}/session`,
      MOCK_SESSION_DATA
    );
    sessionId = sessionResp.body.session.id;
  });

  // Test: POST (Hinzufügen eines neuen Mitglieds)
  test("POST: Should successfully add a new SessionMember (Status 200)", async () => {
    const response = await api.post(
      `/api/group/${groupId}/session/${sessionId}/sessionmember`,
      { memberId: memberId1, seatPos: 3 }
    );

    expect(response.status).toBe(200);
    expect(response.body.sessionMember.memberId).toBe(memberId1);
    expect(response.body.sessionMember.sessionId).toBe(sessionId);
  });

  // Test: POST (Mitglied existiert bereits)
  test("POST: Should fail if SessionMember already exists (Status 400)", async () => {
    const response = await api.post(
      `/api/group/${groupId}/session/${sessionId}/sessionmember`,
      { memberId: playerId }
    );

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message");
  });

  // Test: POST (Validierung - memberId fehlt)
  test('POST: Should fail if "memberId" is missing (Status 400)', async () => {
    const response = await api.post(
      `/api/group/${groupId}/session/${sessionId}/sessionmember`,
      {}
    );

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("issues");
  });

  // Test: GET (Leere Liste)
  test("GET: Should return an empty array if no members exist (Status 200)", async () => {
    const response = await api.get(
      `/api/group/${groupId}/session/${sessionId}/sessionmember`
    );
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  // Test: GET (Liste mit Mitgliedern)
  test("GET: Should return a list with existing SessionMembers (Status 200)", async () => {
    await api.post(`/api/group/${groupId}/session/${sessionId}/sessionmember`, {
      memberId: memberId1,
      seatPos: 3,
    });
    await api.post(`/api/group/${groupId}/session/${sessionId}/sessionmember`, {
      memberId: memberId2,
      seatPos: 2,
    });
    const response = await api.get(
      `/api/group/${groupId}/session/${sessionId}/sessionmember`
    );

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(2);

    const memberIds = response.body.map((member: any) => member.memberId);
    expect(memberIds).toContain(memberId1);
    expect(memberIds).toContain(memberId2);
  });
});
