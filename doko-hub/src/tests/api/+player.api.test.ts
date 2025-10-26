import { api } from '../setup/+api'; 
import { setupDatabase } from '../setup/+setup';
import { db } from '$lib/server/db'; 
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { Sql } from 'postgres';

// Mock data
const NON_EXISTENT_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
const MOCK_PLAYER_IDENTITY = {
    provider: 'GOOGLE', 
    subject: 'google-sub-123456789', 
    email: 'test.user@example.com', 
    createdAt: new Date().toISOString()
};

afterAll(async () => {
    const rawClient = (db as PostgresJsDatabase<any> & { $client: Sql<any> }).$client;

    if (rawClient && rawClient.end) {
        await rawClient.end();
    }
});

// Tests für /api/player (GET & POST)

describe('API /api/player', () => {
    beforeEach(setupDatabase); 

    // Test: GET (Leere Liste)
    test('GET: Should return an empty array if no players exist (Status 200)', async () => {
        const response = await api.get('/api/player');
        expect(response.status).toBe(200);
        expect(response.body).toEqual([]);
    });

    // Test: POST (Erfolgreiches Anlegen)
    test('POST: Should successfully create a new player (Status 201)', async () => {
        const playerName = 'TestPlayer';
        const response = await api.post('/api/player', { name: playerName });

        expect(response.status).toBe(201);
        expect(response.body.message).toBe('Player created');
        expect(response.body.player.name).toBe(playerName);
    });

    // Test: POST (Validierung - Name fehlt/leer)
    test('POST: Should fail if "name" is missing or empty (Status 400)', async () => {
        let response = await api.post('/api/player', {});
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('name is required and must be a string.');
    });
});

// Tests für /api/player/[player] (GET, PUT, DELETE)

describe('API /api/player/[player]', () => {
    let createdPlayerId: string;
    
    beforeEach(async () => {
        await setupDatabase();
        const response = await api.post('/api/player', { name: 'InitialPlayer' });
        createdPlayerId = response.body.player.id;
    });

    // Test: GET (Erfolgreich)
    test('GET: Should return the specific player object (Status 200)', async () => {
        const response = await api.get(`/api/player/${createdPlayerId}`);
        expect(response.status).toBe(200);
        expect(response.body.name).toBe('InitialPlayer');
    });

    // Test: GET (Nicht gefunden)
    test('GET: Should return 400 (Bad Response) if player ID is not found', async () => {
        const response = await api.get(`/api/player/${NON_EXISTENT_ID}`);
        expect(response.status).toBe(400); 
        expect(response.body.error).toBe('Player not found');
    });

    // Test: PUT (Erfolgreiche Aktualisierung des Namens)
    test('PUT: Should successfully update the player name (Status 200)', async () => {
        const newName = 'UpdatedName';
        const response = await api.put(`/api/player/${createdPlayerId}`, { name: newName });
        
        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Updated Player');
        expect(response.body.player.name).toBe(newName);
    });

    // TEST: PUT (Validierung - Name fehlt)
    test('PUT: Should fail if "name" is missing in the update body (Status 400)', async () => {
        const response = await api.put(`/api/player/${createdPlayerId}`, {});
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('name is required and must be a string.');
    });

    // TEST: PUT (Validierung - Name leer)
    test('PUT: Should fail if "name" is an empty string (Status 400)', async () => {
        const response = await api.put(`/api/player/${createdPlayerId}`, { name: '  ' });
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('name is required and must be a string.');
    });

    // Test: DELETE (Erfolgreiches Löschen)
    test('DELETE: Should successfully delete the player (Status 200)', async () => {
        const response = await api.delete(`/api/player/${createdPlayerId}`);
        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Player deleted');

        // Überprüfen
        const getResponse = await api.get(`/api/player/${createdPlayerId}`);
        expect(getResponse.status).toBe(400); 
    });
});

// Tests für /api/player/[player]/regist (POST)

describe('API /api/player/[player]/register', () => {
    let playerIdWithoutIdentity: String;

    beforeEach(async () => {
        await setupDatabase();
        const response = await api.post('/api/player', { name: 'PlayerForRegistration' });
        playerIdWithoutIdentity = response.body.player.id;
    });

    // Test: POST (Erfolgreiche Verknüpfung)
    test('POST: Should successfully link a PlayerIdentity (Status 201)', async () => {
        const response = await api.post(`/api/player/${playerIdWithoutIdentity}/register`, {
            playerIdentity: { ...MOCK_PLAYER_IDENTITY, provider: 'APPLE' }
        });

        expect(response.status).toBe(201);
        expect(response.body.playerIdentity.playerId).toBe(playerIdWithoutIdentity);
        expect(response.body.playerIdentity.provider).toBe('APPLE');
    });

    // Test: POST (Validierung - PlayerIdentity fehlt)
    test('POST: Should fail if playerIdentity body is missing (Status 400)', async () => {
        const response = await api.post(`/api/player/${playerIdWithoutIdentity}/register`, {});
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Valid PlayerIdentity required');
    });

    // Test: POST (Bereits verknüpft)
    test('POST: Should fail if player already has an identity (Status 400)', async () => {
        // Zuerst erfolgreich registrieren
        await api.post(`/api/player/${playerIdWithoutIdentity}/register`, {
            playerIdentity: MOCK_PLAYER_IDENTITY
        });
        
        // Erneuter Versuch
        const response = await api.post(`/api/player/${playerIdWithoutIdentity}/register`, {
            playerIdentity: MOCK_PLAYER_IDENTITY
        });
        
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Player already has an identity');
    });
});

// Tests für /api/player/[player]/identity (GET, PUT, DELETE)

describe('API /api/player/[player]/identity', () => {
    let playerIdWithIdentity: String;
    const initialEmail = MOCK_PLAYER_IDENTITY.email;

    beforeEach(async () => {
        await setupDatabase();
        let playerResp = await api.post('/api/player', { name: 'PlayerIdentityTest' });
        playerIdWithIdentity = playerResp.body.player.id;
        
        await api.post(`/api/player/${playerIdWithIdentity}/register`, {
            playerIdentity: MOCK_PLAYER_IDENTITY
        });
    });

    // Test: GET (Erfolgreich)
    test('GET: Should return the PlayerIdentity object (Status 200)', async () => {
        const response = await api.get(`/api/player/${playerIdWithIdentity}/identity`);
        expect(response.status).toBe(200);
        expect(response.body.email).toBe(initialEmail);
    });

    // Test: GET (Nicht gefunden)
    test('GET: Should return 400 if PlayerIdentity is not found', async () => {
        const playerResp = await api.post('/api/player', { name: 'NoIdentity' });
        const response = await api.get(`/api/player/${playerResp.body.player.id}/identity`);
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('PlayerIdentity not found');
    });

    // Test: PUT (Erfolgreiche Anpassung des E-Mail-Feldes)
    test('PUT: Should successfully update the email (Status 200)', async () => {
        const newEmail = 'updated.email@newdomain.com';
        const response = await api.put(`/api/player/${playerIdWithIdentity}/identity`, {
            playerIdentity: { email: newEmail }
        });

        expect(response.status).toBe(200);
        expect(response.body.playerIdentity.email).toBe(newEmail);
    });

    // Test: PUT (Validierung - Identity-Body fehlt)
    test('PUT: Should return 400 if PlayerIdentity is not included in body', async () => {
        const response = await api.put(`/api/player/${playerIdWithIdentity}/identity`, {});
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Valid PlayerIdentity required');
    });

    // Test: DELETE (Erfolgreiches Löschen)
    test('DELETE: Should successfully delete the PlayerIdentity (Status 200)', async () => {
        const response = await api.delete(`/api/player/${playerIdWithIdentity}/identity`);
        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Deleted PlayerIdentity');

        // Überprüfen
        const getResponse = await api.get(`/api/player/${playerIdWithIdentity}/identity`);
        expect(getResponse.status).toBe(400);
    });

    // Test: DELETE (Nicht gefunden)
    test('DELETE: Should return 400 if PlayerIdentity is not found', async () => {
        const playerResp = await api.post('/api/player', { name: 'NoIdentity2' });
        const response = await api.delete(`/api/player/${playerResp.body.player.id}/identity`);
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('PlayerIdentity not found');
    });
});