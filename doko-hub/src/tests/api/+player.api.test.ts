import { api } from "../setup/+api";
import { setupDatabase } from "../setup/+setup";
import { db } from "$lib/server/db";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { Sql } from "postgres";
import { Player } from "$lib/types";

// Mock data
const NON_EXISTENT_ID = "ffffffff-ffff-ffff-ffff-ffffffffffff";
const MOCK_PLAYER_DATA_FULL = {
  provider: "GOOGLE",
  subject: "google-sub-123456789",
  email: "test.user@example.com",
};
const INITIAL_PLAYER_NAME = "InitialPlayerWithIdentity";

afterAll(async () => {
  const rawClient = (db as PostgresJsDatabase<any> & { $client: Sql<any> })
    .$client;

  if (rawClient && rawClient.end) {
    await rawClient.end();
  }
});

// Tests für /api/player (GET & POST)

describe("API /api/player", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  // Test: GET (Leere Liste)
  test("GET: Should return an empty array if no players exist (Status 200)", async () => {
    const response = await api.get("/api/player");
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  }, 50000);

  // Test: GET (Liste mit angelegten Spielern)
  test("GET: Should return a list with existing players (Status 200)", async () => {
    const name1 = "TestSpieler1";
    await api.post("/api/player", { name: name1, ...MOCK_PLAYER_DATA_FULL });

    const name2 = "TestSpieler2";
    await api.post("/api/player", {
      name: name2,
      ...MOCK_PLAYER_DATA_FULL,
      subject: "sub2",
    });

    const response = await api.get("/api/player");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(2);

    const names = response.body.map((player: any) => player.name);
    expect(names).toContain(name1);
    expect(names).toContain(name2);
  });

  // Test: POST (Validierung - Name falscher Typ)
  test('POST: Should fail if "name" is not a string (Status 400)', async () => {
    let response = await api.post("/api/player", {
      name: 12345,
      ...MOCK_PLAYER_DATA_FULL,
    });
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Validation failed");
  });

  // Test: POST (Erfolgreiches Anlegen mit voller Identity)
  test("POST: Should successfully create a new player with identity (Status 201)", async () => {
    const playerName = "TestPlayerFull";
    const response = await api.post("/api/player", {
      name: playerName,
      ...MOCK_PLAYER_DATA_FULL,
    });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe("Created Player");
    expect(response.body.player.name).toBe(playerName);
    expect(response.body.player.email).toBe(MOCK_PLAYER_DATA_FULL.email);
    expect(response.body.player.provider).toBe(MOCK_PLAYER_DATA_FULL.provider);
  });

  // Test: POST (Validierung - Name fehlt/leer)
  test('POST: Should fail if "name" is missing or empty (Status 400)', async () => {
    let response = await api.post("/api/player", { ...MOCK_PLAYER_DATA_FULL });
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Validation failed");
  });
});

// Tests für /api/player/[player] (GET, PUT, DELETE)

describe("API /api/player/[player]", () => {
  let createdPlayerId: string;

  beforeEach(async () => {
    await setupDatabase();
    const response = await api.post("/api/player", {
      name: INITIAL_PLAYER_NAME,
      ...MOCK_PLAYER_DATA_FULL,
    });
    createdPlayerId = response.body.player.id;
  });

  // Test: GET (Ungültiges ID-Format)
  test("GET: Should return 400 if player ID has an invalid format", async () => {
    const response = await api.get("/api/player/not-a-valid-uuid");
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Player ID required");
  });

  // Test: GET (Erfolgreich - Abfrage inklusive Identity-Feldern)
  test("GET: Should return the specific player object including identity fields (Status 200)", async () => {
    const response = await api.get(`/api/player/${createdPlayerId}`);
    expect(response.status).toBe(200);
    expect(response.body.name).toBe(INITIAL_PLAYER_NAME);
    expect(response.body.provider).toBe(MOCK_PLAYER_DATA_FULL.provider);
    expect(response.body.email).toBe(MOCK_PLAYER_DATA_FULL.email);
  });

  // Test: GET (Nicht gefunden)
  test("GET: Should return 400 (Bad Response) if player ID is not found", async () => {
    const response = await api.get(`/api/player/${NON_EXISTENT_ID}`);
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Player not found");
  });

  // Test: PUT (Validierung - Name falscher Typ)
  test('PUT: Should fail if "name" is not a string in the update body (Status 400)', async () => {
    const playerResponse = await api.get(`/api/player/${createdPlayerId}`);
    let player: Player = Player.parse(playerResponse.body);

    const response = await api.put(`/api/player/${createdPlayerId}`, {
      player: {
        id: player.id,
        name: 9999,
        provider: player.provider,
        subject: player.subject,
        email: player.email,
        createdAt: player.createdAt,
      },
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Valid Player required");
  });

  // Test: PUT (Erfolgreiche Aktualisierung des Namens und der E-Mail)
  test("PUT: Should successfully update the player name and email (Status 200)", async () => {
    const playerResponse = await api.get(`/api/player/${createdPlayerId}`);
    let player: Player = Player.parse(playerResponse.body);
    const newName = "UpdatedName";
    const newEmail = "new.email@updated.com";
    player.name = newName;
    player.email = newEmail;

    const response = await api.put(`/api/player/${createdPlayerId}`, {
      player: player,
    });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Updated Player");
    expect(response.body.player.name).toBe(newName);
    expect(response.body.player.email).toBe(newEmail);
  });

  // TEST: PUT (Validierung - Name leer)
  test('PUT: Should fail if "name" is an empty string (Status 400)', async () => {
    const playerResponse = await api.get(`/api/player/${createdPlayerId}`);
    let player: Player = Player.parse(playerResponse.body);
    const newName = " ";
    player.name = newName;

    const response = await api.put(`/api/player/${createdPlayerId}`, {
      player: player,
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Valid Player required");
  });

  // Test: DELETE (Spieler existiert nicht)
  test("DELETE: Should return 400 if player ID is not found", async () => {
    const response = await api.delete(`/api/player/${NON_EXISTENT_ID}`);
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Player not found");
  });

  // Test: DELETE (Erfolgreiches Löschen)
  test("DELETE: Should successfully delete the player (Status 200)", async () => {
    const response = await api.delete(`/api/player/${createdPlayerId}`);
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Deleted Player");

    const getResponse = await api.get(`/api/player/${createdPlayerId}`);
    expect(getResponse.status).toBe(400);
  });
});
