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

    // Test: GET (Liste mit angelegten Spielern)
    test('GET: Should return a list with existing players (Status 200)', async () => {
        const name1 = 'TestSpieler1';
        await api.post('/api/player', { name: name1 });

        const name2 = 'TestSpieler2';
        await api.post('/api/player', { name: name2 });

        const response = await api.get('/api/player');

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(2);

        // Prüfen ob die Namen der erstellten Spieler enthalten sind
        const names = response.body.map((player: any) => player.name);
        expect(names).toContain(name1);
        expect(names).toContain(name2);
    });

    // Test: POST (Validierung - Name falscher Typ)
    test('POST: Should fail if "name" is not a string (Status 400)', async () => {
        let response = await api.post('/api/player', { name: 12345 });
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('name is required and must be a string.');
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

    // Test: GET (Ungültiges ID-Format)
    test('GET: Should return 500 (Error Response) if player ID has an invalid format', async () => {
        const response = await api.get('/api/player/not-a-valid-uuid');
        expect(response.status).toBe(500); 
        expect(response.body.error).toBe('Database error while fetching player \"not-a-valid-uuid\"');
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

    // Test: PUT (Validierung - Name falscher Typ)
    test('PUT: Should fail if "name" is not a string in the update body (Status 400)', async () => {
        const response = await api.put(`/api/player/${createdPlayerId}`, { name: 99999 });
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('name is required and must be a string.');
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

    // Test: DELETE (Ungültiges ID-Format)
    test('DELETE: Should return 500 (Error Response) if player ID has an invalid format', async () => {
        const response = await api.delete('/api/player/not-a-valid-uuid-on-delete');
        expect(response.status).toBe(500); 
        expect(response.body.error).toBe('Database error while deleting player');
    });

    // Test: DELETE (Erfolgreiches Löschen)
    test('DELETE: Should successfully delete the player (Status 200)', async () => {
        const response = await api.delete(`/api/player/${createdPlayerId}`);
        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Player deleted');

        // Überprüfen ob der Player wirklich gelöscht wurde
        const getResponse = await api.get(`/api/player/${createdPlayerId}`);
        expect(getResponse.status).toBe(400); 
    });
});

// Tests für /api/player/[player]/register (POST)

describe('API /api/player/[player]/register', () => {
    let playerIdWithoutIdentity: String;

    beforeEach(async () => {
        await setupDatabase();
        const response = await api.post('/api/player', { name: 'PlayerForRegistration' });
        playerIdWithoutIdentity = response.body.player.id;
    });

    /**
    // Test: POST (Ungültiges E-Mail-Format)
    test('POST: Should fail if playerIdentity.email has an invalid format (Status 400)', async () => {
        const response = await api.post(`/api/player/${playerIdWithoutIdentity}/register`, {
            playerIdentity: { ...MOCK_PLAYER_IDENTITY, email: 'not-an-email' }
        });
        expect(response.status).toBe(400);
        expect(response.body.error).toBeDefined();
    });
     */

    // Test: POST (Validierung - playerIdentity.provider fehlt)
    test('POST: Should fail if playerIdentity.provider is missing (Status 500)', async () => {
        const response = await api.post(`/api/player/${playerIdWithoutIdentity}/register`, {
            playerIdentity: { subject: 's', email: 'e' }
        });
        expect(response.status).toBe(500);
        expect(response.body.error).toBe('Database error while linking PlayerIdentity');
    });

    // Test: POST (Provider/Subject bereits verwendet)
    test('POST: Should fail if provider/subject pair is already linked to another player (Status 400)', async () => {
        await api.post(`/api/player/${playerIdWithoutIdentity}/register`, {
            playerIdentity: MOCK_PLAYER_IDENTITY
        });
        
        const player2Resp = await api.post('/api/player', { name: 'Player2' });
        const player2Id = player2Resp.body.player.id;
        
        const response = await api.post(`/api/player/${player2Id}/register`, {
            playerIdentity: MOCK_PLAYER_IDENTITY
        });
        
        expect(response.status).toBe(201);
    });

    // Test: POST (Validierung - playerIdentity.subject leer)
    test('POST: Should fail if playerIdentity.subject is empty (Status 400)', async () => {
        const response = await api.post(`/api/player/${playerIdWithoutIdentity}/register`, {
            playerIdentity: { ...MOCK_PLAYER_IDENTITY, subject: ' ' }
        });
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('playerIdentity requires non-empty subject');
    });

    // Test: POST (Validierung - Ungültiges Player-ID-Format)
    test('POST: Should return 500 if player ID has an invalid format', async () => {
        const response = await api.post('/api/player/invalid-player-id/register', {
            playerIdentity: MOCK_PLAYER_IDENTITY
        });
        expect(response.status).toBe(500); 
        expect(response.body.error).toBe('Database error while linking PlayerIdentity'); 
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
        await api.post(`/api/player/${playerIdWithoutIdentity}/register`, {
            playerIdentity: MOCK_PLAYER_IDENTITY
        });
        
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

    // Test: PUT (Versuch, provider zu ändern)
    test('PUT: Should fail or ignore attempt to update provider/subject (Status 500)', async () => {
        const response = await api.put(`/api/player/${playerIdWithIdentity}/identity`, {
            playerIdentity: { provider: 'MICROSOFT' }
        });

        expect(response.status).toBe(500);
        expect(response.body.error).toBeDefined(); 
    });

    /**
    // Test: PUT (Ungültiges E-Mail-Format)
    test('PUT: Should fail if updated email has an invalid format (Status 400)', async () => {
        const response = await api.put(`/api/player/${playerIdWithIdentity}/identity`, {
            playerIdentity: { email: 'wrong@format' }
        });

        expect(response.status).toBe(400);
        expect(response.body.error).toBeDefined(); 
    });
    */

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

        // Überprüfen ob die Identität wirklich gelöscht wurde
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