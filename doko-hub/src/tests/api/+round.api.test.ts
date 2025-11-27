import { api } from '../setup/+api';
import { setupDatabase } from '../setup/+setup';
import { db } from '$lib/server/db';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { Sql } from 'postgres';
import { GameType, Round, RoundParticipation } from '$lib/types';

// Mock data
const NON_EXISTENT_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

const MOCK_PLAYER_DATA_FULL = {
    provider: 'GOOGLE',
    subject: 'round-test-subject',
    email: 'round.test@example.com',
};

const MOCK_SESSION_DATA = {
    ruleset: 'STANDARD', 
    plannedRounds: 10,
    startedAt: new Date().toISOString(), 
};

const MOCK_ROUND_DATA = {
    roundNum: 12, 
    gameType: 'SOLO_FARBE', 
    soloKind: 'CLUBS', 
    eyesRe: 60, 
};

const MOCK_RE_PARTICIPATION = {
    side: 'RE', 
};

const MOCK_CALL_DATA = {
    call: 'RE',
};

const MOCK_BONUS_DATA = {
    bonus: 'DOKO',
};


afterAll(async () => {
    const rawClient = (db as PostgresJsDatabase<any> & { $client: Sql<any> }).$client;

    if (rawClient && rawClient.end) {
        await rawClient.end();
    }
});

async function setupRoundEnvironment() {
    await setupDatabase();

    const creatorResp = await api.post('/api/player', { name: 'Creator', ...MOCK_PLAYER_DATA_FULL });
    const creatorPlayerId: string = creatorResp.body.player.id;

    const groupResp = await api.post('/api/group', { name: 'RoundTestGroup', creatorId: creatorPlayerId });
    const groupId: string = groupResp.body.playGroup.id;

    const membersResp = await api.get(`/api/group/${groupId}/member`);
    const creatorMemberId: string = membersResp.body.find((m: any) => m.playerId === creatorPlayerId).id;

    const sessionResp = await api.post(`/api/group/${groupId}/session`, MOCK_SESSION_DATA);
    const sessionId: string = sessionResp.body.session.id;

    await api.post(`/api/group/${groupId}/session/${sessionId}/sessionmember`, { memberId: creatorMemberId, seatPos: 1 });

    let nextSeatPos = 2;

    const createPlayerAndMember = async (name: string, seatPos: number) => {
        const playerResp = await api.post('/api/player', { name: name, ...MOCK_PLAYER_DATA_FULL});
        const playerId = playerResp.body.player.id;

        const memberResp = await api.post(`/api/group/${groupId}/member`, { playerId: playerId });
        const memberId = memberResp.body.playGroupMember.id;

        await api.post(`/api/group/${groupId}/session/${sessionId}/sessionmember`, { memberId: memberId, seatPos: seatPos });
        
        return { playerId, memberId };
    };

    const re = await createPlayerAndMember('Player RE', nextSeatPos++);
    const kontra = await createPlayerAndMember('Player KONTRA', nextSeatPos++);
    const another = await createPlayerAndMember('Another Player', nextSeatPos++);

    return { 
        groupId, 
        sessionId, 
        creatorMemberId,
        reMemberId: re.memberId, 
        kontraMemberId: kontra.memberId, 
        anotherMemberId: another.memberId 
    };
}

// Tests für /api/group/[group]/session/[session]/round (GET & POST)
describe('API /api/group/[group]/session/[session]/round (Round)', () => {
    let groupId: string;
    let sessionId: string;

    beforeEach(async () => {
        const env = await setupRoundEnvironment();
        ({ groupId, sessionId } = env);
    });

    // Test: POST (Erfolgreiches Erstellen einer neuen Runde)
    test('POST: Should successfully create a new Round (Status 200)', async () => {
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

    beforeEach(async () => {
        const env = await setupRoundEnvironment();
        ({ groupId, sessionId } = env);

        const roundResp = await api.post(`/api/group/${groupId}/session/${sessionId}/round`, MOCK_ROUND_DATA);

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
        const newRoundNumber = 20;
        const newGameType = 'HOCHZEIT';
        const newSoloKind = null;
        const newEyesRe = 70;
        
        const roundResponse = await api.get(`/api/group/${groupId}/session/${sessionId}/round/${roundId}`);
        let round: Round = Round.parse(roundResponse.body);
        round.roundNum = newRoundNumber;
        round.gameType = newGameType;
        round.soloKind = newSoloKind;
        round.eyesRe = newEyesRe;

        const response = await api.put(`/api/group/${groupId}/session/${sessionId}/round/${roundId}`, {round: round});

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Updated Round');
        expect(response.body.round.roundNum).toBe(newRoundNumber);
        expect(response.body.round.gameType).toBe(newGameType);
        expect(response.body.round.eyesRe).toBe(newEyesRe);
        expect(response.body.round.soloKind).toBe(newSoloKind);
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
    let reMemberId: string; 
    let kontraMemberId: string; 
    let validParticipationData: any; 

    beforeEach(async () => {
        const env = await setupRoundEnvironment();
        ({ groupId, sessionId, reMemberId, kontraMemberId } = env);
        
        const roundResp = await api.post(`/api/group/${groupId}/session/${sessionId}/round`, MOCK_ROUND_DATA);
        roundId = roundResp.body.round.id;
        validParticipationData = { ...MOCK_RE_PARTICIPATION, memberId: reMemberId }; 
    });

    // Test: POST (Erfolgreiches Erstellen einer neuen Participation)
    test('POST Participation (Side/Seat): Should successfully create a new RoundParticipation (Status 200)', async () => {
        const response = await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/participation`, validParticipationData);

        expect(response.status).toBe(200); 
        expect(response.body.message).toBe('Created RoundParticipation');
        expect(response.body.roundParticipation.memberId).toBe(reMemberId); 
        expect(response.body.roundParticipation.side).toBe(validParticipationData.side);
    });

    // Test: POST (Participation existiert bereits)
    test('POST: Should fail if Participation already exists (Status 400)', async () => {
        await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/participation`, validParticipationData);
        const response = await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/participation`, validParticipationData);

        expect(response.status).toBe(400);
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
        const kontraParticipation = { ...MOCK_RE_PARTICIPATION, memberId: kontraMemberId, side: 'KONTRA', seatPos: 2 }; 
        await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/participation`, kontraParticipation);

        const response = await api.get(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/participation`);

        expect(response.status).toBe(200);
        expect(response.body.length).toBe(2);
    });
});


// Tests für /api/group/[group]/session/[session]/round/[round]/participation/[memberId] (GET, PUT)
describe('API /api/group/[group]/session/[session]/round/[round]/participation/[memberId] (Side/Seat + Score)', () => {
    let groupId: string;
    let sessionId: string;
    let roundId: string;
    let reMemberId: string; 

    beforeEach(async () => {
        const env = await setupRoundEnvironment();
        ({ groupId, sessionId, reMemberId } = env);
        
        const roundResp = await api.post(`/api/group/${groupId}/session/${sessionId}/round`, MOCK_ROUND_DATA);
        roundId = roundResp.body.round.id;

        const participationData = { ...MOCK_RE_PARTICIPATION, memberId: reMemberId }; 
        await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/participation`, participationData);
    });

    // Test: GET (Abfrage einer spezifischen Participation)
    test('GET: Should return the specific RoundParticipation object (Status 200)', async () => {
        const response = await api.get(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/participation/${reMemberId}`); 
        expect(response.status).toBe(200); 
        expect(response.body.memberId).toBe(reMemberId); 
        expect(response.body.side).toBe(MOCK_RE_PARTICIPATION.side);
    });

    /**
    // Test: PUT (Aktualisierung von side)
    test('PUT: Should successfully update side (Status 200)', async () => {
        const newSide = 'KONTRA';

        const participationResponse = await api.get(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/participation/${reMemberId}`);
        let participation: RoundParticipation = RoundParticipation.parse(participationResponse.body);
        participation.side = newSide;

        console.log("1: ", `/api/group/${groupId}/session/${sessionId}/round/${roundId}/participation/${reMemberId}`, );
        const response = await api.put(`/api/group/${groupId}/session/${sessionId}/round/${roundId}`, {participation: participation});
        console.log("check: ",response);

        expect(response.status).toBe(200); 
        expect(response.body.message).toBe('Updated Participation and Score');
        expect(response.body.roundParticipation.side).toBe(newSide);
    });

    */

    // Test: GET (Participation existiert nicht)
    test('GET: Should return 400 if Participation for member is not found', async () => {
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
    let reMemberId: string; 
    let kontraMemberId: string; 
    let callData: typeof MOCK_CALL_DATA & { memberId: string }; 

    beforeEach(async () => {
        const env = await setupRoundEnvironment();
        ({ groupId, sessionId, reMemberId, kontraMemberId } = env);
        
        const roundResp = await api.post(`/api/group/${groupId}/session/${sessionId}/round`, MOCK_ROUND_DATA);
        roundId = roundResp.body.round.id;
        
        callData = { ...MOCK_CALL_DATA, memberId: reMemberId }; 
    });

    // Test: POST (Erfolgreiches Erstellen eines neuen Calls)
    test('POST: Should successfully create a new RoundCall (Status 200)', async () => {
        const response = await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/call`, callData);

        expect(response.status).toBe(200); 
        expect(response.body.message).toBe('Created RoundCall');
        expect(response.body.roundCall.memberId).toBe(reMemberId); 
        expect(response.body.roundCall.call).toBe(callData.call);
    });

    // Test: POST (Mitglied existiert bereits)
    test('POST: Should fail if RoundCall already exists for player/round (Status 400)', async () => {
        await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/call`, callData);

        const response = await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/call`, callData);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message');
    });
    
    // Test: GET (Alle Calls der Runde)
    test('GET: Should return a list with existing RoundCalls (Status 200)', async () => {
        await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/call`, callData);
        await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/call`, { memberId: kontraMemberId, call: 'KONTRA' }); 

        const response = await api.get(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/call`);

        expect(response.status).toBe(200);
        expect(response.body.length).toBe(2);
    });
});

// Tests für /api/group/[group]/session/[session]/round/[round]/call/[memberId] (GET)
describe('API /api/group/[group]/session/[session]/round/[round]/call/[memberId] (Call Details)', () => {
    let groupId: string;
    let sessionId: string;
    let roundId: string;
    let reMemberId: string; 
    let callId: string;

    beforeEach(async () => {
        const env = await setupRoundEnvironment();
        ({ groupId, sessionId, reMemberId } = env);
        
        const roundResp = await api.post(`/api/group/${groupId}/session/${sessionId}/round`, MOCK_ROUND_DATA);
        roundId = roundResp.body.round.id;
        
        const callResp = await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/call`, { ...MOCK_CALL_DATA, memberId: reMemberId }); 
        callId = callResp.body.roundCall.id;
    });

    // Test: GET (Abfrage eines spezifischen Calls)
    test('GET: Should return the specific RoundCall object (Status 200)', async () => {
        console.log("CallGetAPI: ", `/api/group/${groupId}/session/${sessionId}/round/${roundId}/call/${callId}`);
        const response = await api.get(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/call/${callId}`); 
        console.log("CallGetResponse: ", response);
        expect(response.status).toBe(200);
        expect(response.body.memberId).toBe(reMemberId); 
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
    let kontraMemberId: string; 
    let bonusData: typeof MOCK_BONUS_DATA & { memberId: string }; 

    beforeEach(async () => {
        const env = await setupRoundEnvironment();
        ({ groupId, sessionId, kontraMemberId } = env);
        
        const roundResp = await api.post(`/api/group/${groupId}/session/${sessionId}/round`, MOCK_ROUND_DATA);
        roundId = roundResp.body.round.id;
        
        bonusData = { ...MOCK_BONUS_DATA, memberId: kontraMemberId }; 
    });

    // Test: POST (Erfolgreiches Erstellen eines neuen Bonus)
    test('POST: Should successfully create a new RoundBonus (Status 200)', async () => {
        const response = await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/bonus`, bonusData);

        expect(response.status).toBe(200); 
        expect(response.body.message).toBe('Created RoundBonus');
        expect(response.body.roundBonus.memberId).toBe(kontraMemberId); 
        expect(response.body.roundBonus.bonus).toBe(bonusData.bonus);
    });

    // Test: POST (Allow multiple Boni)
    test('POST: Should allow multiple RoundBonuses for the same player/round (Status 200)', async () => {
        await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/bonus`, bonusData);

        const newBonusData = { memberId: kontraMemberId, bonus: 'KARLCHEN' }; 
        const response = await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/bonus`, newBonusData);

        expect(response.status).toBe(200); 
        expect(response.body.roundBonus.bonus).toBe('KARLCHEN');
    });

    // Test: GET (Alle Boni der Runde)
    test('GET: Should return a list with existing RoundBonuses (Status 200)', async () => {
        await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/bonus`, bonusData);
        await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/bonus`, { memberId: kontraMemberId, bonus: 'FUCHS' }); 

        const response = await api.get(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/bonus`);

        expect(response.status).toBe(200);
        expect(response.body.length).toBe(2);
    });
});

// Tests für /api/group/[group]/session/[session]/round/[round]/bonus/[memberId] (GET)
describe('API /api/group/[group]/session/[session]/round/[round]/bonus/[memberId] (Bonus Details)', () => {
    let groupId: string;
    let sessionId: string;
    let roundId: string;
    let kontraMemberId: string; 
    let bonusId: string;

    beforeEach(async () => {
        const env = await setupRoundEnvironment();
        ({ groupId, sessionId, kontraMemberId } = env);
        
        const roundResp = await api.post(`/api/group/${groupId}/session/${sessionId}/round`, MOCK_ROUND_DATA);
        roundId = roundResp.body.round.id;
        
        await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/bonus`, { ...MOCK_BONUS_DATA, memberId: kontraMemberId }); 
        const bonusResp = await api.post(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/bonus`, { memberId: kontraMemberId, bonus: 'KARLCHEN' });
        bonusId = bonusResp.body.id;
    });

    // Test: GET (Abfrage ALLER Boni)
    test('GET: Should return ALL RoundBonus objects for the specific player (Status 200)', async () => {
        const response = await api.get(`/api/group/${groupId}/session/${sessionId}/round/${roundId}/bonus/${bonusId}`); 
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