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
    
    let creatorPlayerId: string;
    let creatorMemberId: string;

    const createPlayerAndMember = async (name: string, subject: string, group_id: string, session_id: string) => {
        const resp = await api.post('/api/player', { name: name, ...MOCK_PLAYER_DATA_FULL, subject: subject });
        const playerId = resp.body.player.id;

        const memberResp = await api.post(`/api/group/${group_id}/member`, { playerId: playerId });
        const memberId = memberResp.body.playGroupMember.id;

        await api.post(`/api/group/${group_id}/session/${session_id}/sessionmember`, { memberId: memberId });
        return { playerId, memberId };
    };


    const creator = await createPlayerAndMember('Creator', 'creator-sub', NON_EXISTENT_ID, NON_EXISTENT_ID);
    creatorPlayerId = creator.playerId;
    creatorMemberId = creator.memberId;


    const groupResp = await api.post('/api/group', { name: 'ResultsTestGroup', createdBy: creatorPlayerId });
    const groupId: string = groupResp.body.playGroup.id;

    const membersResp = await api.get(`/api/group/${groupId}/member`);
    creatorMemberId = membersResp.body.find((m: any) => m.playerId === creatorPlayerId).id;

    const sessionResp = await api.post(`/api/group/${groupId}/session`, MOCK_SESSION_DATA);
    const sessionId: string = sessionResp.body.session.id;

    const players: PlayerSetup[] = [];

    const playerRE = await createPlayerAndMember('Player RE', 're-sub', groupId, sessionId);
    players.push(playerRE);
    RE_PLAYER_ID = playerRE.playerId;

    const playerKontraA = await createPlayerAndMember('Player KONTRA A', 'kontra-a-sub', groupId, sessionId);
    players.push(playerKontraA);
    KONTRA_PLAYER_ID_A = playerKontraA.playerId;

    const playerKontraB = await createPlayerAndMember('Player KONTRA B', 'kontra-b-sub', groupId, sessionId);
    players.push(playerKontraB);
    KONTRA_PLAYER_ID_B = playerKontraB.playerId;

    if (numPlayers === 4) {
        const playerKontraC = await createPlayerAndMember('Player KONTRA C', 'kontra-c-sub', groupId, sessionId);
        players.push(playerKontraC);
        KONTRA_PLAYER_ID_C = playerKontraC.playerId;
    }

    const roundResp = await api.post(`/api/group/${groupId}/session/${sessionId}/round`, MOCK_ROUND_DATA);
    const roundId: string = roundResp.body.round.id;
    
    await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/participation`, { memberId: playerRE.memberId, side: 'RE', seatPos: 1 });
    await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/participation`, { memberId: playerKontraA.memberId, side: 'KONTRA', seatPos: 2 });
    await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/participation`, { memberId: playerKontraB.memberId, side: 'RE', seatPos: 3 }); 
    if (numPlayers === 4) {
        const playerKontraC = players.find(p => p.playerId === KONTRA_PLAYER_ID_C);
        if (playerKontraC) {
            await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/participation`, { memberId: playerKontraC.memberId, side: 'KONTRA', seatPos: 4 });
        }
    }

    await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/call`, { memberId: playerRE.memberId, call: 'RE' });
    await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/bonus`, { memberId: playerRE.memberId, bonus: 'FUCHS' });
    await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/bonus`, { memberId: playerKontraA.memberId, bonus: 'DOKO' });

    return { groupId, sessionId, roundId };
}


// Tests für /api/group/[group]/session/[session]/results (GET)
describe('API /api/group/[group]/session/[session]/results (Aggregation)', () => {
    let groupId: string;
    let sessionId: string;
    
    beforeAll(async () => {
        const env = await setupFullRound(4);
        ({ groupId, sessionId } = env);
    });

    // Test: Erfolgreiche Berechnung (Status 200)
    test('GET: Should successfully calculate and return results for a session (Status 200)', async () => {
        const response = await api.get(`/api/group/${groupId}/session/${sessionId}/results`);
        
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
        expect(rePlayerResult).toHaveProperty('points');
    });
    
    // Test: Ungültiges Session ID Format
    test('GET: Should return 400 if session ID has an invalid format', async () => {
        const response = await api.get(`/api/group/${groupId}/session/not-a-valid-uuid/results`);
        expect(response.status).toBe(400); 
        expect(response.body).toHaveProperty('message');
    });

    // Test: Session existiert nicht
    test('GET: Should return 400 if session is not found (da die Session-Prüfung im Handler fehlschlägt)', async () => {
        const response = await api.get(`/api/group/${groupId}/session/${NON_EXISTENT_ID}/results`);
        expect(response.status).toBe(400); 
        expect(response.body.message).toBe('Session not found'); 
    });

    // Test: Keine Runden vorhanden
    test('GET: Should return an empty array of results if the session has no rounds (Status 200)', async () => {
        await setupDatabase();

        const creatorResp = await api.post('/api/player', { name: 'NoRoundCreator', ...MOCK_PLAYER_DATA_FULL, subject: 'no-round-sub' });
        const creatorPlayerId: string = creatorResp.body.player.id;

        const groupResp = await api.post('/api/group', { name: 'NoRoundGroup', createdBy: creatorPlayerId });
        const newGroupId: string = groupResp.body.playGroup.id;

        const sessionResp = await api.post(`/api/group/${newGroupId}/session`, MOCK_SESSION_DATA);
        const newSessionId: string = sessionResp.body.session.id;

        const response = await api.get(`/api/group/${newGroupId}/session/${newSessionId}/results`);
        
        expect(response.status).toBe(200);
        expect(response.body.sessionResults).toEqual([]);
        expect(response.body.message).toBe('No rounds found for this session.');
    });
});