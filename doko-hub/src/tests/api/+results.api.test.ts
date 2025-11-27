import { api } from '../setup/+api';
import { setupDatabase } from '../setup/+setup';
import { db } from '$lib/server/db';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { Sql } from 'postgres';

// Mock Data
const NON_EXISTENT_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

const MOCK_PLAYER_DATA_FULL = {
    provider: 'GOOGLE',
    subject: 'results-test-subject',
    email: 'results.test@example.com',
};

const MOCK_SESSION_DATA = {
    ruleset: 'STANDARD',
    plannedRounds: 1,
    startedAt: new Date().toISOString(), 
};

const MOCK_ROUND_DATA = {
    roundNum: 1, 
    gameType: 'NORMAL', 
    eyesRe: 150,
    soloKind: null,
};

let RE_PLAYER_ID: string;
let KONTRA_PLAYER_ID_A: string;
let KONTRA_PLAYER_ID_B: string;
let KONTRA_PLAYER_ID_C: string;

afterAll(async () => {
    const rawClient = (db as PostgresJsDatabase<any> & { $client: Sql<any> }).$client;
    if (rawClient && rawClient.end) {
        await rawClient.end();
    }
});

interface PlayerSetup {
    playerId: string;
    memberId: string;
}

async function setupFullRound(numPlayers: number = 4) {
    await setupDatabase();

    const creatorResp = await api.post('/api/player', { name: 'Creator', ...MOCK_PLAYER_DATA_FULL });
    const creatorPlayerId: string = creatorResp.body.player.id;

    const groupResp = await api.post('/api/group', { name: 'ResultsTestGroup', creatorId: creatorPlayerId });
    const groupId: string = groupResp.body.playGroup.id;

    const membersResp = await api.get(`/api/group/${groupId}/member`);
    let creatorMemberId: string = membersResp.body.find((m: any) => m.playerId === creatorPlayerId).id;

    const sessionResp = await api.post(`/api/group/${groupId}/session`, MOCK_SESSION_DATA);
    const sessionId: string = sessionResp.body.session.id;

    let nextSeatPos = 1;

    const createPlayerAndMember = async (name: string, seatPos: number) => {
        const playerResp = await api.post('/api/player', { name: name, ...MOCK_PLAYER_DATA_FULL });
        const playerId = playerResp.body.player.id;

        const memberResp = await api.post(`/api/group/${groupId}/member`, { playerId: playerId });
        const memberId = memberResp.body.playGroupMember.id;

        await api.post(`/api/group/${groupId}/session/${sessionId}/sessionmember`, { memberId: memberId, seatPos: seatPos });
        
        return { playerId, memberId };
    };

    const players: PlayerSetup[] = [];

    const playerRE = await createPlayerAndMember('Player RE', nextSeatPos++);
    players.push(playerRE);
    RE_PLAYER_ID = playerRE.playerId;

    const playerKontraA = await createPlayerAndMember('Player KONTRA A', nextSeatPos++);
    players.push(playerKontraA);
    KONTRA_PLAYER_ID_A = playerKontraA.playerId;

    const playerKontraB = await createPlayerAndMember('Player KONTRA B', nextSeatPos++);
    players.push(playerKontraB);
    KONTRA_PLAYER_ID_B = playerKontraB.playerId;

    if (numPlayers === 4) {
        const playerKontraC = await createPlayerAndMember('Player KONTRA C', nextSeatPos++);
        players.push(playerKontraC);
        KONTRA_PLAYER_ID_C = playerKontraC.playerId;
    }

    const roundResp = await api.post(`/api/group/${groupId}/session/${sessionId}/round`, MOCK_ROUND_DATA);
    const roundId: string = roundResp.body.round.id;

    const getMemberIdByPlayerId = (id: string) => players.find(p => p.playerId === id)?.memberId || creatorMemberId;

    await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/participation`, { memberId: getMemberIdByPlayerId(RE_PLAYER_ID), side: 'RE' });
    await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/participation`, { memberId: getMemberIdByPlayerId(KONTRA_PLAYER_ID_A), side: 'KONTRA' });
    await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/participation`, { memberId: getMemberIdByPlayerId(KONTRA_PLAYER_ID_B), side: 'RE' }); 
    if (numPlayers === 4) {
        await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/participation`, { memberId: getMemberIdByPlayerId(KONTRA_PLAYER_ID_C), side: 'KONTRA' });
    }

    await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/call`, { memberId: getMemberIdByPlayerId(RE_PLAYER_ID), call: 'RE' });
    await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/bonus`, { memberId: getMemberIdByPlayerId(RE_PLAYER_ID), bonus: 'FUCHS' });
    await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/bonus`, { memberId: getMemberIdByPlayerId(KONTRA_PLAYER_ID_A), bonus: 'DOKO' });

    return { groupId, sessionId, roundId };
}


// Tests für /api/group/[group]/session/[session]/result (GET)
describe('API /api/group/[group]/session/[session]/result (Aggregation)', () => {
    let groupId: string;
    let sessionId: string;
    
    beforeAll(async () => {
        const env = await setupFullRound(4);
        ({ groupId, sessionId } = env);
    });

    // Test: Erfolgreiche Berechnung (Status 200)
    test('GET: Should successfully calculate and return results for a session (Status 200)', async () => {
        const response = await api.get(`/api/group/${groupId}/session/${sessionId}/result`);
        
        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Session results calculated successfully.');
        expect(Array.isArray(response.body.sessionResults)).toBe(true);
        expect(response.body.sessionResults.length).toBe(4);

        const playerIds = response.body.sessionResults.map((r: any) => r.player_id);
        expect(playerIds).toContain(RE_PLAYER_ID);
        expect(playerIds).toContain(KONTRA_PLAYER_ID_A);
        expect(playerIds).toContain(KONTRA_PLAYER_ID_B);
        expect(playerIds).toContain(KONTRA_PLAYER_ID_C);

        const rePlayerResult = response.body.sessionResults.find((r: any) => r.player_id === RE_PLAYER_ID);
        //console.log("PlayerResuls: ", response.body.sessionResults);
        expect(rePlayerResult).toHaveProperty('points');
    });
    
    // Test: Ungültiges Session ID Format
    test('GET: Should return 400 if session ID has an invalid format', async () => {
        const response = await api.get(`/api/group/${groupId}/session/not-a-valid-uuid/result`);
        expect(response.status).toBe(400); 
        expect(response.body).toHaveProperty('message');
    });

    // Test: Session existiert nicht
    test('GET: Should return 400 if session is not found (da die Session-Prüfung im Handler fehlschlägt)', async () => {
        const response = await api.get(`/api/group/${groupId}/session/${NON_EXISTENT_ID}/result`);
        expect(response.status).toBe(400); 
        expect(response.body.message).toBe('Session not found'); 
    });

    // Test: Keine Runden vorhanden
    test('GET: Should return an empty array of results if the session has no rounds (Status 200)', async () => {
        await setupDatabase();

        const creatorResp = await api.post('/api/player', { name: 'NoRoundCreator', ...MOCK_PLAYER_DATA_FULL });
        const creatorPlayerId: string = creatorResp.body.player.id;

        const groupResp = await api.post('/api/group', { name: 'NoRoundGroup', creatorId: creatorPlayerId });
        const newGroupId: string = groupResp.body.playGroup.id;

        const membersResp = await api.get(`/api/group/${newGroupId}/member`);
        const creatorMemberId: string = membersResp.body.find((m: any) => m.playerId === creatorPlayerId).id;

        const sessionResp = await api.post(`/api/group/${newGroupId}/session`, MOCK_SESSION_DATA);
        const newSessionId: string = sessionResp.body.session.id;

        await api.post(`/api/group/${newGroupId}/session/${newSessionId}/sessionmember`, { memberId: creatorMemberId, seatPos: 1 });

        const response = await api.get(`/api/group/${newGroupId}/session/${newSessionId}/result`);
        
        expect(response.status).toBe(200);
        expect(response.body.sessionResults.length).toBe(1);
        expect(response.body.sessionResults[0].player_name).toBe('NoRoundCreator');
        expect(response.body.sessionResults[0].points).toBe(0);
        expect(response.body.message).toBe('No rounds in session. Results are 0 for all participants.');
    });
});