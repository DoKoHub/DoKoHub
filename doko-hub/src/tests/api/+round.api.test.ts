import { api } from '../setup/+api';
import { setupDatabase } from '../setup/+setup';
import { db } from '$lib/server/db';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { Sql } from 'postgres';

// Mock data
const NON_EXISTENT_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

const MOCK_SESSION_DATA = {
    ruleSet: 'STANDARD', 
    plannedRounds: 10,
    startedAt: new Date().toISOString(), 
};

const MOCK_ROUND_DATA = {
    roundNum: 12, 
    gameType: 'SOLO_FARBE', 
    soloColor: 'CLUBS', 
};

let RE_PLAYER_ID: string;
let KONTRA_PLAYER_ID: string;

const MOCK_RE_PARTICIPATION = {
    side: 'RE', 
    seatPos: 1,
};

const MOCK_RE_SCORE = {
    eyes: 90,
};

const MOCK_CALL_DATA = {
    call: 'RE',
};

const MOCK_BONUS_DATA = {
    bonus: 'DOKO',
    count: 1,
};


afterAll(async () => {
    const rawClient = (db as PostgresJsDatabase<any> & { $client: Sql<any> }).$client;

    if (rawClient && rawClient.end) {
        await rawClient.end();
    }
});

async function setupRoundEnvironment() {
    const logs: string[] = [];

    const logAndCall = async (method: 'GET' | 'POST' | 'PUT' | 'DELETE', endpoint: string, data: any, logMessage: string) => {
        const resp = await api[method.toLowerCase() as 'post' | 'get' | 'put' | 'delete'](endpoint, data);
        if (resp.status >= 400) {
            logs.push(`[ERROR] ${logMessage}: Status ${resp.status}, Body: ${JSON.stringify(resp.body)}`);
        }
        logs.push(`[SUCCESS] ${logMessage}: Status ${resp.status}`);
        return resp;
    };


    await setupDatabase();
    logs.push("[SETUP] Database reset complete.");

    const groupResp = await logAndCall('POST', '/api/group', { name: 'RoundTestGroup' }, 'Created Group');
    const groupId: string = groupResp.body.playGroup.id;
    logs.push(`[ID] Group ID: ${groupId}`);

    const sessionResp = await logAndCall('POST', `/api/group/${groupId}/session`, MOCK_SESSION_DATA, 'Created Session');
    const sessionId: string = sessionResp.body.session.id;
    logs.push(`[ID] Session ID: ${sessionId}`);

    const createPlayer = async (name: string) => {
        const resp = await logAndCall('POST', '/api/player', { name: name }, `Created Player ${name}`);
        const id = resp.body.player.id;
        logs.push(`[ID] Player ID for ${name}: ${id}`);

        await logAndCall('POST', `/api/group/${groupId}/member`, { playerId: id }, `Added Player ${name} to Group`);

        await logAndCall('POST', `/api/group/${groupId}/session/${sessionId}/sessionmember`, { playerId: id }, `Added Player ${name} to Session`);
        
        return id;
    };

    const rePlayerId = await createPlayer('Player RE');
    const kontraPlayerId = await createPlayer('Player KONTRA');
    const anotherPlayerId = await createPlayer('Another Player');

    RE_PLAYER_ID = rePlayerId;
    KONTRA_PLAYER_ID = kontraPlayerId;
    
    return { groupId, sessionId, rePlayerId, kontraPlayerId, anotherPlayerId };
}

// Tests für /api/group/[group]/session/[session]/round (GET & POST)
describe('API /api/group/[group]/session/[session]/round (Round)', () => {
    let groupId: string;
    let sessionId: string;
    let rePlayerId: string;

    beforeEach(async () => {
        const env = await setupRoundEnvironment();
        ({ groupId, sessionId, rePlayerId } = env);
    });

    // Test: POST (Erfolgreiches Erstellen einer neuen Runde)
    test('POST: Should successfully create a new Round (Status 200/201)', async () => {
        console.log("Request: ",`/api/group/${groupId}/session/${sessionId}/round`, MOCK_ROUND_DATA);
        const response = await api.post(`/api/group/${groupId}/session/${sessionId}/round`, MOCK_ROUND_DATA);

        expect(response.status).toBe(200); 
        expect(response.body.message).toBe('Created Round');
        expect(response.body.round.roundNum).toBe(MOCK_ROUND_DATA.roundNum);
        expect(response.body.round.gameType).toBe(MOCK_ROUND_DATA.gameType);
        expect(response.body.round.sessionId).toBe(sessionId);
    });

    // Test: POST (Validierung - required fields fehlen)
    test('POST: Should fail if required fields (roundNum/gameType) are missing (Status 400)', async () => {
        let response = await api.post(`/api/group/${groupId}/session/${sessionId}/round`, {});
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('issues');
    });

    // Test: GET (Leere Liste)
    test('GET: Should return an empty array if no rounds exist (Status 200)', async () => {
        const response = await api.get(`/api/group/${groupId}/session/${sessionId}/round`);
        expect(response.status).toBe(200);
        expect(response.body).toEqual([]);
    });

    // Test: GET (Liste mit angelegten Runden)
    test('GET: Should return a list with existing rounds (Status 200)', async () => {
        await api.post(`/api/group/${groupId}/session/${sessionId}/round`, MOCK_ROUND_DATA);
        await api.post(`/api/group/${groupId}/session/${sessionId}/round`, { ...MOCK_ROUND_DATA, roundNum: 2 });

        const response = await api.get(`/api/group/${groupId}/session/${sessionId}/round`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(2);
    });
});

// Tests für /api/group/[group]/session/[session]/round/[round] (GET, PUT)
describe('API /api/group/[group]/session/[session]/round/[round] (Round Details)', () => {
    let groupId: string;
    let sessionId: string;
    let roundId: string;
    let rePlayerId: string;

    beforeEach(async () => {
        const env = await setupRoundEnvironment();
        ({ groupId, sessionId, rePlayerId } = env);

        const roundResp = await api.post(`/api/group/${groupId}/session/${sessionId}/round`, MOCK_ROUND_DATA);

        if (roundResp.status !== 200 && roundResp.status !== 201) {
            console.error(`[FATAL SETUP ERROR] Failed to create Round (Status ${roundResp.status}). Body: ${JSON.stringify(roundResp.body)}`);
            throw new Error('Setup failed: Could not create Round'); 
        }
        roundId = roundResp.body.round.id;
    });

    // Test: GET (Abfrage einer spezifischen Runde)
    test('GET: Should return the specific Round object (Status 200)', async () => {
        const response = await api.get(`/api/group/${groupId}/session/${sessionId}/round/${roundId}`);
        expect(response.status).toBe(200);
        expect(response.body.gameType).toBe(MOCK_ROUND_DATA.gameType);
    });

    // Test: GET (Runde existiert nicht)
    test('GET: Should return 400 if round ID is not found', async () => {
        const response = await api.get(`/api/group/${groupId}/session/${sessionId}/round/${NON_EXISTENT_ID}`);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message');
    });

    // Test: PUT (Aktualisierung von roundNum und gameType)
    test('PUT: Should successfully update roundNum and gameType (Status 200)', async () => {
        const newRoundNumber = 10;
        const newGameType = 'HOCHZEIT';

        const updateData = { roundNum: newRoundNumber, gameType: newGameType, soloColor: null };

        const response = await api.put(`/api/group/${groupId}/session/${sessionId}/round/${roundId}`, updateData);

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Updated Round');
        expect(response.body.round.roundNum).toBe(newRoundNumber);
        expect(response.body.round.gameType).toBe(newGameType);
    });

    // Test: PUT (Validierung - required fields fehlen)
    test('PUT: Should fail if required fields are missing in body (Status 400)', async () => {
        const response = await api.put(`/api/group/${groupId}/session/${sessionId}/round/${roundId}`, {}); 
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message');
    });
});

// Tests für /api/group/[group]/session/[session]/round/[round]/participation (GET & POST)
describe('API /api/group/[group]/session/[session]/round/[round]/participation (Side/Seat + Score)', () => {
    let groupId: string;
    let sessionId: string;
    let roundId: string;
    let rePlayerId: string;
    let kontraPlayerId: string;
    let validParticipationData: any; 

    beforeEach(async () => {
        const env = await setupRoundEnvironment();
        ({ groupId, sessionId, rePlayerId, kontraPlayerId } = env);
        
        const roundResp = await api.post(`/api/group/${groupId}/session/${sessionId}/round`, MOCK_ROUND_DATA);
        if (roundResp.status !== 200 && roundResp.status !== 201) { throw new Error('Setup failed: Could not create Round'); }
        roundId = roundResp.body.round.id;
        validParticipationData = { ...MOCK_RE_PARTICIPATION, playerId: rePlayerId };
    });

    // Test: POST (Erfolgreiches Erstellen einer neuen Participation)
    test('POST Participation (Side/Seat): Should successfully create a new RoundParticipation (Status 200/201)', async () => {
        const response = await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/participation`, validParticipationData);

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Created RoundParticipation');
        expect(response.body.roundParticipation.playerId).toBe(rePlayerId);
        expect(response.body.roundParticipation.side).toBe(validParticipationData.side);
    });

    // Test: POST (Participation existiert bereits)
    test('POST: Should fail if Participation already exists (Status 500)', async () => {
        await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/participation`, validParticipationData);
        const response = await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/participation`, validParticipationData);

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('message');
    });

    // Test: GET (Leere Liste)
    test('GET: Should return an empty array if no participations exist (Status 200)', async () => {
        const response = await api.get(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/participation`);
        expect(response.status).toBe(200);
        expect(response.body).toEqual([]);
    });

    // Test: GET (Liste mit angelegten Participations)
    test('GET Participations: Should return a list with existing RoundParticipations (Status 200)', async () => {
        await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/participation`, validParticipationData);
        const kontraParticipation = { ...MOCK_RE_PARTICIPATION, playerId: kontraPlayerId, side: 'KONTRA', seatPos: 2 };
        await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/participation`, kontraParticipation);

        const response = await api.get(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/participation`);

        expect(response.status).toBe(200);
        expect(response.body.length).toBe(2);
    });
});


// Tests für /api/group/[group]/session/[session]/round/[round]/participation/[playerId] (GET, PUT)
describe('API /api/group/[group]/session/[session]/round/[round]/participation/[playerId] (Side/Seat + Score)', () => {
    let groupId: string;
    let sessionId: string;
    let roundId: string;
    let rePlayerId: string;

    beforeEach(async () => {
        const env = await setupRoundEnvironment();
        ({ groupId, sessionId, rePlayerId } = env);
        
        const roundResp = await api.post(`/api/group/${groupId}/session/${sessionId}/round`, MOCK_ROUND_DATA);
        if (roundResp.status !== 200 && roundResp.status !== 201) { throw new Error('Setup failed: Could not create Round'); }
        roundId = roundResp.body.round.id;

        const participationData = { ...MOCK_RE_PARTICIPATION, playerId: rePlayerId };
        await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/participation`, participationData);
    });

    // Test: GET (Abfrage einer spezifischen Participation)
    test('GET: Should return the specific RoundParticipation object (Status 200)', async () => {
        const response = await api.get(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/participation/${rePlayerId}`);
        expect(response.status).toBe(200); 
        expect(response.body.playerId).toBe(rePlayerId);
        expect(response.body.side).toBe(MOCK_RE_PARTICIPATION.side);
    });

    // Test: PUT (Aktualisierung von side, seatPos, and eyes)
    test('PUT: Should successfully update side, seatPos, and eyes (Status 200)', async () => {
        const newSide = 'KONTRA';
        const newSeatPos = 4;
        const newEyes = 30;

        const updateData = { side: newSide, seatPos: newSeatPos, eyes: newEyes };

        const response = await api.put(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/participation/${rePlayerId}`, updateData);

        expect(response.status).toBe(200); 
        expect(response.body.message).toBe('Updated Participation and Score');
        expect(response.body.roundParticipation.side).toBe(newSide);
        expect(response.body.roundParticipation.seatPos).toBe(newSeatPos);
        expect(response.body.roundScore.eyes).toBe(newEyes); 
    });

    // Test: GET (Participation existiert nicht)
    test('GET: Should return 400 if Participation for player is not found', async () => {
        const response = await api.get(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/participation/${NON_EXISTENT_ID}`);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message');
    });
});

// Tests für /api/group/[group]/session/[session]/round/[round]/call (GET & POST)
describe('API /api/group/[group]/session/[session]/round/[round]/call', () => {
    let groupId: string;
    let sessionId: string;
    let roundId: string;
    let rePlayerId: string;
    let kontraPlayerId: string;
    let callData: typeof MOCK_CALL_DATA & { playerId: string };

    beforeEach(async () => {
        const env = await setupRoundEnvironment();
        ({ groupId, sessionId, rePlayerId, kontraPlayerId } = env);
        
        const roundResp = await api.post(`/api/group/${groupId}/session/${sessionId}/round`, MOCK_ROUND_DATA);
        if (roundResp.status !== 200 && roundResp.status !== 201) { throw new Error('Setup failed: Could not create Round'); }
        roundId = roundResp.body.round.id;
        
        callData = { ...MOCK_CALL_DATA, playerId: rePlayerId };
    });

    // Test: POST (Erfolgreiches Erstellen eines neuen Calls)
    test('POST: Should successfully create a new RoundCall (Status 200/201)', async () => {
        const response = await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/call`, callData);

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Created RoundCall');
        expect(response.body.call.playerId).toBe(rePlayerId);
        expect(response.body.call.call).toBe(callData.call);
    });

    // Test: POST (Mitglied existiert bereits)
    test('POST: Should fail if RoundCall already exists for player/round (Status 500)', async () => {
        await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/call`, callData);

        const response = await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/call`, callData);

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('message');
    });
    
    // Test: GET (Alle Calls der Runde)
    test('GET: Should return a list with existing RoundCalls (Status 200)', async () => {
        await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/call`, callData);
        await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/call`, { ...callData, playerId: kontraPlayerId, call: 'KONTRA' });

        const response = await api.get(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/call`);

        expect(response.status).toBe(200);
        expect(response.body.length).toBe(2);
    });
});

// Tests für /api/group/[group]/session/[session]/round/[round]/call/[playerId] (GET)
describe('API /api/group/[group]/session/[session]/round/[round]/call/[playerId] (Call Details)', () => {
    let groupId: string;
    let sessionId: string;
    let roundId: string;
    let rePlayerId: string;
    let callId: string;

    beforeEach(async () => {
        const env = await setupRoundEnvironment();
        ({ groupId, sessionId, rePlayerId } = env);
        
        const roundResp = await api.post(`/api/group/${groupId}/session/${sessionId}/round`, MOCK_ROUND_DATA);
        if (roundResp.status !== 200 && roundResp.status !== 201) { throw new Error('Setup failed: Could not create Round'); }
        roundId = roundResp.body.round.id;
        
        const callResp = await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/call`, { ...MOCK_CALL_DATA, playerId: rePlayerId });
        if (callResp.status !== 200 && callResp.status !== 201) { throw new Error('Setup failed: Could not create Call'); }
        callId = callResp.body.call.id;
    });

    // Test: GET (Abfrage eines spezifischen Calls)
    test('GET: Should return the specific RoundCall object (Status 200)', async () => {
        const response = await api.get(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/call/${rePlayerId}`);
        expect(response.status).toBe(200);
        expect(response.body.playerId).toBe(rePlayerId);
        expect(response.body.call).toBe(MOCK_CALL_DATA.call);
    });

    // Test: GET (Call existiert nicht)
    test('GET: Should return 400 if Call for player is not found', async () => {
        const response = await api.get(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/call/${NON_EXISTENT_ID}`);
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message');
    });
});

// Tests für /api/group/[group]/session/[session]/round/[round]/bonus (GET & POST)
describe('API /api/group/[group]/session/[session]/round/[round]/bonus', () => {
    let groupId: string;
    let sessionId: string;
    let roundId: string;
    let kontraPlayerId: string;
    let bonusData: typeof MOCK_BONUS_DATA & { playerId: string };

    beforeEach(async () => {
        const env = await setupRoundEnvironment();
        ({ groupId, sessionId, kontraPlayerId } = env);
        
        const roundResp = await api.post(`/api/group/${groupId}/session/${sessionId}/round`, MOCK_ROUND_DATA);
        if (roundResp.status !== 200 && roundResp.status !== 201) { throw new Error('Setup failed: Could not create Round'); }
        roundId = roundResp.body.round.id;
        
        bonusData = { ...MOCK_BONUS_DATA, playerId: kontraPlayerId };
    });

    // Test: POST (Erfolgreiches Erstellen eines neuen Bonus)
    test('POST: Should successfully create a new RoundBonus (Status 200/201)', async () => {
        const response = await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/bonus`, bonusData);

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Created RoundBonus');
        expect(response.body.bonus.playerId).toBe(kontraPlayerId);
        expect(response.body.bonus.bonus).toBe(bonusData.bonus);
        expect(response.body.bonus.count).toBe(bonusData.count);
    });

    // Test: POST (Allow multiple Boni)
    test('POST: Should allow multiple RoundBonuses for the same player/round (Status 200/201)', async () => {
        await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/bonus`, bonusData);

        const newBonusData = { ...bonusData, bonus: 'KARLCHEN', count: 2 };
        const response = await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/bonus`, newBonusData);

        expect(response.status).toBe(200);
        expect(response.body.bonus.bonus).toBe('KARLCHEN');
    });

    // Test: GET (Alle Boni der Runde)
    test('GET: Should return a list with existing RoundBonuses (Status 200)', async () => {
        await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/bonus`, bonusData);
        await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/bonus`, { ...bonusData, bonus: 'FUCHS', count: 1 });

        const response = await api.get(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/bonus`);

        expect(response.status).toBe(200);
        expect(response.body.length).toBe(2);
    });
});

// Tests für /api/group/[group]/session/[session]/round/[round]/bonus/[playerId] (GET)
describe('API /api/group/[group]/session/[session]/round/[round]/bonus/[playerId] (Bonus Details)', () => {
    let groupId: string;
    let sessionId: string;
    let roundId: string;
    let kontraPlayerId: string;

    beforeEach(async () => {
        const env = await setupRoundEnvironment();
        ({ groupId, sessionId, kontraPlayerId } = env);
        
        const roundResp = await api.post(`/api/group/${groupId}/session/${sessionId}/round`, MOCK_ROUND_DATA);
        if (roundResp.status !== 200 && roundResp.status !== 201) { throw new Error('Setup failed: Could not create Round'); }
        roundId = roundResp.body.round.id;
        
        await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/bonus`, { ...MOCK_BONUS_DATA, playerId: kontraPlayerId });
        await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/bonus`, { ...MOCK_BONUS_DATA, playerId: kontraPlayerId, bonus: 'KARLCHEN', count: 2 });
    });

    // Test: GET (Abfrage ALLER Boni)
    test('GET: Should return ALL RoundBonus objects for the specific player (Status 200)', async () => {
        const response = await api.get(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/bonus/${kontraPlayerId}`);
        expect(response.status).toBe(200); 
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(2);
    });

    // Test: GET (Bonus existiert nicht)
    test('GET: Should return 200 with empty array if no Bonus for player is found', async () => {
        const response = await api.get(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/bonus/${NON_EXISTENT_ID}`);
        expect(response.status).toBe(200); 
        expect(response.body).toEqual([]);
    });
});