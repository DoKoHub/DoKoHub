import { api } from '../setup/+api';
import { setupDatabase } from '../setup/+setup';
import { db } from '$lib/server/db';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { Sql } from 'postgres';

// Mock data
const NON_EXISTENT_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

const MOCK_SESSION_DATA = {
    ruleset: 'STANDARD', // ruleSet zu ruleset korrigiert
    plannedRounds: 42,
    startedAt: new Date().toISOString(), 
};

// Notwendige Daten für die Spielerstellung (Identity)
const MOCK_PLAYER_DATA_FULL = {
    provider: 'GOOGLE',
    subject: 'session-test-subject',
    email: 'session.test@example.com',
};

afterAll(async () => {
    const rawClient = (db as PostgresJsDatabase<any> & { $client: Sql<any> }).$client;

    if (rawClient && rawClient.end) {
        await rawClient.end();
    }
});

// Tests für /api/group/[group]/session (GET & POST)

describe('API /api/group/[group]/session', () => {
    let groupId: string;
    let playerId: string; 

    beforeEach(async () => {
        await setupDatabase();
        
        // 1. Player erstellen (mit Identity Daten)
        const playerResp = await api.post('/api/player', {
            name: 'Creator1', 
            ...MOCK_PLAYER_DATA_FULL
        });
        playerId = playerResp.body.player.id;
        
        // 2. Gruppe erstellen (muss createdBy enthalten)
        const groupResp = await api.post('/api/group', { name: 'SessionTestGroup', createdBy: playerId });
        groupId = groupResp.body.playGroup.id;

        // NEU: Explizit den Creator als Mitglied hinzufügen, da auto-add scheinbar fehlschlägt
        await api.post(`/api/group/${groupId}/member`, { playerId: playerId });
    });

    // Test: POST (Erfolgreiches Erstellen einer neuen Session)
    test('POST: Should successfully create a new Session (Status 201)', async () => {
        const response = await api.post(`/api/group/${groupId}/session`, MOCK_SESSION_DATA);

        expect(response.status).toBe(201);
        expect(response.body.message).toBe('Created Session');
        expect(response.body.session.ruleset).toBe(MOCK_SESSION_DATA.ruleset);
        expect(response.body.session.plannedRounds).toBe(MOCK_SESSION_DATA.plannedRounds);
        expect(response.body.session.groupId).toBe(groupId); 
        expect(response.body.session.endedAt).toBeNull();
    });

    // Test: POST (Validierung - ruleset/plannedRounds fehlt)
    test('POST: Should fail if required fields (ruleset/plannedRounds) are missing (Status 400)', async () => {
        let response = await api.post(`/api/group/${groupId}/session`, {});
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('issues'); 
        
        response = await api.post(`/api/group/${groupId}/session`, { plannedRounds: 10 });
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('issues');
    });

    // Test: GET (Leere Liste)
    test('GET: Should return an empty array if no sessions exist (Status 200)', async () => {
        const response = await api.get(`/api/group/${groupId}/session`);
        expect(response.status).toBe(200);
        expect(response.body).toEqual([]);
    });

    // Test: GET (Liste mit angelegten Sessions)
    test('GET: Should return a list with existing sessions (Status 200)', async () => {
        await api.post(`/api/group/${groupId}/session`, MOCK_SESSION_DATA);
        await api.post(`/api/group/${groupId}/session`, { ...MOCK_SESSION_DATA, plannedRounds: 10 });

        const response = await api.get(`/api/group/${groupId}/session`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(2); 
    });

    // Test: GET (Ungültige Gruppen-ID)
    test('GET: Should return 400 if group ID has an invalid format', async () => {
        const response = await api.get('/api/group/not-a-valid-uuid/session');
        expect(response.status).toBe(400); 
        expect(response.body).toHaveProperty('message');
    });
});

// Tests für /api/group/[group]/session/[session] (GET, PUT)

describe('API /api/group/[group]/session/[session]', () => {
    let groupId: string;
    let sessionId: string;
    let playerId: string; 
    const NON_EXISTENT_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
    let initialStartedAt: string; 
    let initialRuleset: string;

    beforeEach(async () => {
        await setupDatabase();
        
        // 1. Player erstellen
        const playerResp = await api.post('/api/player', { name: 'Creator2', ...MOCK_PLAYER_DATA_FULL, subject: 'sub-s2' });
        playerId = playerResp.body.player.id;
        
        // 2. Gruppe erstellen (muss createdBy enthalten)
        const groupResp = await api.post('/api/group', { name: 'ManageSessionGroup', createdBy: playerId });
        groupId = groupResp.body.playGroup.id;

        // NEU: Explizit den Creator als Mitglied hinzufügen
        await api.post(`/api/group/${groupId}/member`, { playerId: playerId });
        
        // 3. Session erstellen
        const sessionResp = await api.post(`/api/group/${groupId}/session`, MOCK_SESSION_DATA);
        sessionId = sessionResp.body.session.id;
        initialStartedAt = sessionResp.body.session.startedAt;
        initialRuleset = sessionResp.body.session.ruleset;
    });

    // Test: GET (Abfrage einer spezifischen Session)
    test('GET: Should return the specific Session object (Status 200)', async () => {
        const response = await api.get(`/api/group/${groupId}/session/${sessionId}`);
        expect(response.status).toBe(200);
        expect(response.body.plannedRounds).toBe(MOCK_SESSION_DATA.plannedRounds);
    });

    // Test: GET (Session existiert nicht)
    test('GET: Should return 400 if session ID is not found', async () => {
        const response = await api.get(`/api/group/${groupId}/session/${NON_EXISTENT_ID}`);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message');
    });

    // Test: PUT (Aktualisierung von plannedRounds und endedAt)
    test('PUT: Should successfully update plannedRounds and endedAt (Status 200)', async () => {
        const newRounds = 100;
        const endedDate = new Date().toISOString();
        
        const updateDataFull = { 
            id: sessionId,          
            groupId: groupId,       
            ruleset: initialRuleset, 
            plannedRounds: newRounds, 
            endedAt: endedDate,
            startedAt: initialStartedAt 
        };

        const response = await api.put(`/api/group/${groupId}/session/${sessionId}`, updateDataFull);

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Updated Session');
        expect(response.body.session.plannedRounds).toBe(newRounds);
        expect(response.body.session.endedAt).not.toBeNull();
    });

    // Test: PUT (Validierung - required fields fehlen)
    test('PUT: Should fail if required fields are missing in body (Status 400)', async () => {
        const response = await api.put(`/api/group/${groupId}/session/${sessionId}`, {}); 
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message');
    });

    // Test: PUT (Ungültiges Session-ID-Format)
    test('PUT: Should return 400 if session ID has an invalid format', async () => {
        const response = await api.put(`/api/group/${groupId}/session/not-a-valid-uuid`, MOCK_SESSION_DATA);
        expect(response.status).toBe(400); 
        expect(response.body).toHaveProperty('message');
    });
});

// Tests für /api/group/[group]/session/[session]/sessionmember (GET & POST)

describe('API /api/group/[group]/session/[session]/sessionmember', () => {
    let groupId: string;
    let sessionId: string;
    let playerId: string;
    let memberId: string; // PlayGroupMember ID
    const NON_EXISTENT_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

    beforeEach(async () => {
        await setupDatabase();

        // 1. Create Player
        const playerResp = await api.post('/api/player', { name: 'SessionPlayer1', ...MOCK_PLAYER_DATA_FULL, subject: 'sub-sess-p1' });
        playerId = playerResp.body.player.id;
        
        // 2. Create Group
        const groupResp = await api.post('/api/group', { name: 'SessionMemberGroup', createdBy: playerId });
        groupId = groupResp.body.playGroup.id;
        
        // NEU: Explizit den Creator als Mitglied hinzufügen
        const addMemberResp = await api.post(`/api/group/${groupId}/member`, { playerId: playerId });
        memberId = addMemberResp.body.playGroupMember.id;

        // 3. Create Session
        const sessionResp = await api.post(`/api/group/${groupId}/session`, MOCK_SESSION_DATA);
        sessionId = sessionResp.body.session.id;
    });

    // Test: POST (Hinzufügen eines neuen Mitglieds)
    test('POST: Should successfully add a new SessionMember (Status 201)', async () => {
        const response = await api.post(`/api/group/${groupId}/session/${sessionId}/sessionmember`, { memberId: memberId });

        expect(response.status).toBe(201); 
        expect(response.body.sessionMember.memberId).toBe(memberId); 
        expect(response.body.sessionMember.sessionId).toBe(sessionId);
    });

    // Test: POST (Mitglied existiert bereits)
    test('POST: Should fail if SessionMember already exists (Status 500)', async () => {
        await api.post(`/api/group/${groupId}/session/${sessionId}/sessionmember`, { memberId: memberId });

        const response = await api.post(`/api/group/${groupId}/session/${sessionId}/sessionmember`, { memberId: memberId });

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('message');
    });

    // Test: POST (Validierung - memberId fehlt)
    test('POST: Should fail if "memberId" is missing (Status 400)', async () => {
        const response = await api.post(`/api/group/${groupId}/session/${sessionId}/sessionmember`, {});

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('issues');
    });

    // Test: GET (Leere Liste)
    test('GET: Should return an empty array if no members exist (Status 200)', async () => {
        const response = await api.get(`/api/group/${groupId}/session/${sessionId}/sessionmember`);
        expect(response.status).toBe(200);
        expect(response.body).toEqual([]);
    });

    // Test: GET (Liste mit Mitgliedern)
    test('GET: Should return a list with existing SessionMembers (Status 200)', async () => {
        // 1. Füge das erste Mitglied hinzu
        await api.post(`/api/group/${groupId}/session/${sessionId}/sessionmember`, { memberId: memberId });

        // 2. Erstelle zweiten Spieler/Mitglied
        const player2Resp = await api.post('/api/player', { name: 'SessionPlayer2', ...MOCK_PLAYER_DATA_FULL, subject: 'sub-sess-p2' });
        const player2Id = player2Resp.body.player.id;
        
        // Füge Spieler 2 zur Gruppe hinzu (erzeugt PlayGroupMember 2)
        const member2Resp = await api.post(`/api/group/${groupId}/member`, { playerId: player2Id });
        const member2Id = member2Resp.body.playGroupMember.id;
        
        // Füge zweites Mitglied zur Session hinzu
        await api.post(`/api/group/${groupId}/session/${sessionId}/sessionmember`, { memberId: member2Id });

        const response = await api.get(`/api/group/${groupId}/session/${sessionId}/sessionmember`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(2);

        const memberIds = response.body.map((member: any) => member.memberId); 
        expect(memberIds).toContain(memberId);
        expect(memberIds).toContain(member2Id);
    });
});