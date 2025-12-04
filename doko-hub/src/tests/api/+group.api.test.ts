import { api } from '../setup/+api';
import { setupDatabase } from '../setup/+setup';
import { db } from '$lib/server/db';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { Sql } from 'postgres';
import { cleanupExpiredInvites } from '$lib/server/cleanup-invites';
import { PlayGroup, PlayGroupMember } from '$lib/types';

// Mock data
const NON_EXISTENT_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

const MOCK_PLAYER_DATA_FULL = {
    provider: 'GOOGLE',
    subject: 'group-test-sub',
    email: 'group.test@example.com'
};

afterAll(async () => {
    const rawClient = (db as PostgresJsDatabase<any> & { $client: Sql<any> }).$client;

    if (rawClient && rawClient.end) {
        await rawClient.end();
    }
});

// Tests für /api/group (GET & POST)

describe('API /api/group', () => {
    let mockCreatorId: string;
    const mockNickname = 'GroupCreatorNick';

    beforeEach(async () => {
        await setupDatabase();
        const playerResp = await api.post('/api/player', {
            name: 'CreatorPlayer',
            ...MOCK_PLAYER_DATA_FULL
        });
        mockCreatorId = playerResp.body.player.id;
    });

    // Test: GET (Liste von allen Gruppen)
    test('GET: Should return a list of all PlayGroup objects (Status 200) including members', async () => {
        await api.post('/api/group', { name: 'GroupA', creatorId: mockCreatorId, nickname: 'CreatorA' });

        const player2Resp = await api.post('/api/player', { name: 'CreatorPlayer2', ...MOCK_PLAYER_DATA_FULL });
        const mockCreatorId2 = player2Resp.body.player.id;

        await api.post('/api/group', { name: 'GroupB', creatorId: mockCreatorId2, nickname: 'CreatorB' });

        const response = await api.get('/api/group');
        expect(response.status).toBe(200);
        expect(response.body.length).toBe(2);

        expect(response.body[0].name).toBe('GroupA');
        expect(response.body[1].name).toBe('GroupB');
    });

    // Test: POST (Name kein String)
    test('POST: Should fail if "name" is not a string (Status 400)', async () => {
        const response = await api.post('/api/group', { name: 1001, creatorId: mockCreatorId }); 
        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Validation failed');
    });

    // Test: POST (Anlegen einer neuen Gruppe)
    test('POST: Should successfully create a new PlayGroup and add the creator as member (Status 201)', async () => {
        const groupName = 'NewGamingGroup';

        const response = await api.post('/api/group', { 
            name: groupName,
            creatorId: mockCreatorId,
            nickname: mockNickname
        });

        expect(response.status).toBe(201);
        expect(response.body.message).toBe('Created PlayGroup');
        expect(response.body.playGroup.name).toBe(groupName);
        expect(response.body.playGroup.members.length).toBe(1);
        expect(response.body.playGroup.members[0].playerId).toBe(mockCreatorId);
        expect(response.body.playGroup.members[0].nickname).toBe(mockNickname);
    });

    // Test: POST (Name ist leer)
    test('POST: Should fail if "name" is empty (Status 400)', async () => {
        const response = await api.post('/api/group', { name: '  ', creatorId: mockCreatorId }); 
        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Validation failed');
    });

    // Test: POST (creatorId fehlt)
    test('POST: Should fail if "creatorId" is missing (Status 400)', async () => {
        const response = await api.post('/api/group', { name: 'TestName' });
        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Validation failed');
    });
});

// Tests für /api/group/[group] (GET, PUT, DELETE)

describe('API /api/group/[group]', () => {
    let createdGroupId: string;
    let mockCreatorId: string;

    beforeEach(async () => {
        await setupDatabase();
        const playerResp = await api.post('/api/player', {
            name: 'CreatorPlayerForGroup',
            provider: 'GOOGLE',
            subject: 'group-test-sub',
            email: 'group.test@example.com'
        });
        mockCreatorId = playerResp.body.player.id;

        const response = await api.post('/api/group', { name: 'GroupToManage', creatorId: mockCreatorId });
        createdGroupId = response.body.playGroup.id;
    });

    // Test: GET (ungültiges ID-Format)
    test('GET: Should return 400 if group ID has an invalid format', async () => {
        const response = await api.get('/api/group/not-a-valid-uuid');
        expect(response.status).toBe(400);
        expect(response.body.message).toBe('PlayGroup ID required');
    });

    // Test: GET (Abfrage einer spezifischen Gruppe)
    test('GET: Should return the specific PlayGroup object (Status 200)', async () => {
        const response = await api.get(`/api/group/${createdGroupId}`);
        expect(response.status).toBe(200);
        expect(response.body.members).toBeDefined();
        expect(response.body.members.length).toBe(1);
    });

    // Test: GET (Gruppe existiert nicht)
    test('GET: Should return 400 if group ID is not found', async () => {
        const response = await api.get(`/api/group/${NON_EXISTENT_ID}`);
        expect(response.status).toBe(400);
        expect(response.body.message).toBe('PlayGroup not found');
    });

    // Test: PUT (Leerer Name)
    test('PUT: Should fail if "name" is an empty string (Status 400)', async () => {
        const updateData = ' ';
        const groupResponse = await api.get(`/api/group/${createdGroupId}`);
        let group: PlayGroup = PlayGroup.parse(groupResponse.body);
        group.name = updateData;
        const response = await api.put(`/api/group/${createdGroupId}`,{playGroup: group});

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Valid PlayGroup required');
    });

    // Test: PUT (Aktualisierung des Gruppennamens)
    test('PUT: Should successfully update name (Status 200)', async () => {
        const updateData = 'RenamedGroup';
        const groupResponse = await api.get(`/api/group/${createdGroupId}`);
        let group: PlayGroup = PlayGroup.parse(groupResponse.body);
        group.name = updateData;
        const response = await api.put(`/api/group/${createdGroupId}`,{playGroup: group});

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Updated PlayGroup');
        expect(response.body.playGroup.name).toBe(updateData);
    });

    // Test: DELETE (Gruppe existiert nicht)
    test('DELETE: Should return 400 if group ID is not found', async () => {
        const response = await api.delete(`/api/group/${NON_EXISTENT_ID}`);
        expect(response.status).toBe(400);
        expect(response.body.message).toBe('PlayGroup not found');
    });

    // Test: DELETE (ungültiges ID-Format)
    test('DELETE: Should return 400 if group ID has an invalid format', async () => {
        const response = await api.delete('/api/group/invalid-uuid-to-delete');
        expect(response.status).toBe(400);
        expect(response.body.message).toBe('PlayGroup ID required');
    });

    /** 
    // Test: DELETE (Löschen einer Gruppe)
    test('DELETE: Should successfully delete the PlayGroup (Status 200)', async () => {
        const response = await api.delete(`/api/group/${createdGroupId}`);
        expect(response.status).toBe(200);

        const getResponse = await api.get(`/api/group/${createdGroupId}`);
        expect(getResponse.status).toBe(400);
        expect(getResponse.body.message).toBe('PlayGroup not found');
    });
    */
});

// Tests für /api/group/member & /api/group/invite/join

describe('API /api/group/member & /api/group/invite/join', () => {
    let groupId: string;
    let playerId: string;
    let memberId: string;

    beforeEach(async () => {
        await setupDatabase();

        const creatorResp = await api.post('/api/player', { name: 'CreatorPlayer', ...MOCK_PLAYER_DATA_FULL });
        const creatorId = creatorResp.body.player.id;

        const groupResp = await api.post('/api/group', { name: 'MemberTestGroup', creatorId: creatorId, nickname: test });
        groupId = groupResp.body.playGroup.id;

        const members = groupResp.body.playGroup.members;
        memberId = members[0].id;
        playerId = creatorId;
    });

    // Tests für /api/group/[group]/member

    // Test: POST (Spieler existiert bereits)
    test('POST Member: Should fail if Player is already a member (Status 400)', async () => {
        const response = await api.post(`/api/group/${groupId}/member`, { playerId: playerId });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Player is a member already');
    });

    // Test: POST (Spieler-ID fehlt)
    test('POST Member: Should fail if playerId is missing (Status 400)', async () => {
        const response = await api.post(`/api/group/${groupId}/member`, {});

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Validation failed');
    });

    // Test: POST Member (Gruppe existiert nicht)
    test('POST Member: Should fail if Group ID does not exist (Status 400)', async () => {
        const response = await api.post(`/api/group/${NON_EXISTENT_ID}/member`, { playerId: playerId });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('PlayGroup not found');
    });

    // Test: POST Member (Spieler existiert nicht)
    test('POST Member: Should fail if Player ID does not exist (Status 400)', async () => {
        const response = await api.post(`/api/group/${groupId}/member`, { playerId: NON_EXISTENT_ID });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Player not found');
    });

    // Test: POST (Hinzufügen eines Spielers)
    test('POST Member: Should successfully add a Player to the group (Status 201)', async () => {
        const player2Resp = await api.post('/api/player', { name: 'NewMember', ...MOCK_PLAYER_DATA_FULL });
        const player2Id = player2Resp.body.player.id;

        const response = await api.post(`/api/group/${groupId}/member`, { playerId: player2Id });

        expect(response.status).toBe(201);
        expect(response.body.playGroupMember.playerId).toBe(player2Id);
    });

    // Test: GET (Abfragen der Spielerliste)
    test('GET Members: Should return a list of PlayGroupMember objects (Status 200)', async () => {
        const response = await api.get(`/api/group/${groupId}/member`);
        expect(response.status).toBe(200);
        expect(response.body.length).toBe(1);
        expect(response.body[0].playerId).toBe(playerId);
    });

    // Tests für /api/group/[group]/member/[member]

    // Test: PUT Member (Mitglied existiert nicht)
    test('PUT Member: Should fail if the member ID to update does not exist (Status 400)', async () => {
        const newNickname = 'GhostMember';
        const memberResponse = await api.get(`/api/group/${groupId}/member/${memberId}`);

        let member: PlayGroupMember = PlayGroupMember.parse(memberResponse.body);
        member.nickname = newNickname;

        const response = await api.put(`/api/group/${groupId}/member/${NON_EXISTENT_ID}`, { playGroupMember: member });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('PlayGroupMember not found'); 
    });

    // Test: PUT (playGroupMember Nickname ist leer)
    test('PUT Member: Should fail if field "nickname" is empty (Status 400)', async () => {
        const newNickname = '';
        const memberResponse = await api.get(`/api/group/${groupId}/member/${memberId}`);

        let member: PlayGroupMember = PlayGroupMember.parse(memberResponse.body);
        member.nickname = newNickname;

        const response = await api.put(`/api/group/${groupId}/member/${memberId}`, { playGroupMember: member });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Valid PlayGroupMember required'); 
    });

    // Test: PUT (Aktualisieren des Nicknames)
    test('PUT Member: Should successfully update nickname (Status 200)', async () => {
        const newNickname = 'TheLeader';
        const memberResponse = await api.get(`/api/group/${groupId}/member/${memberId}`);
        let member: PlayGroupMember = PlayGroupMember.parse(memberResponse.body);
        member.nickname = newNickname;
        const response = await api.put(`/api/group/${groupId}/member/${memberId}`, { playGroupMember: member });

        expect(response.status).toBe(200);
        expect(response.body.playGroupMember.nickname).toBe(newNickname);
    });

    // Test: DELETE (Spieler-ID existiert nicht)
    test('DELETE Member: Should fail if member ID does not exist (Status 400)', async () => {
        const response = await api.delete(`/api/group/${groupId}/member/${NON_EXISTENT_ID}`);

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('PlayGroupMember not found');
    });

    // Test: DELETE (Löschen eines Spielers)
    test('DELETE Member: Should successfully "delete" the PlayGroupMember (Status 200, Status LEFT)', async () => {
        const response = await api.delete(`/api/group/${groupId}/member/${memberId}`);
        expect(response.status).toBe(200);

        const memberStatusResponse = await api.get(`/api/group/${groupId}/member/${memberId}`);
        expect(memberStatusResponse.body.status).toBe('LEFT');
    });

    // Tests für /api/group/[group]/invite & /api/group/join/[token]

    // Test: POST (playerId fehlt)
    test('POST Invite: Should fail if createdBy (playerId) is missing (Status 400)', async () => {
        const response = await api.post(`/api/group/${groupId}/invite`, {
            expiresAt: new Date(Date.now() + 3600000).toISOString()
        });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Validation failed');
    });

    // Test: POST (ungültiges Tokenformat)
    test('POST Join Token: Should fail with invalid token format (Status 400)', async () => {
        const player2Resp = await api.post('/api/player', { name: 'JoiningPlayer2', ...MOCK_PLAYER_DATA_FULL });
        const player2Id = player2Resp.body.player.id;

        const response = await api.post('/api/group/join/not-a-valid-token-format', { playerId: player2Id });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('GroupInvite not found');
    });

    // Test: POST (playerId im Body fehlt)
    test('POST Join Token: Should fail if playerId is missing in body (Status 400)', async () => {
        const inviteResp = await api.post(`/api/group/${groupId}/invite`, {
            createdBy: playerId,
            expiresAt: new Date(Date.now() + 3600000).toISOString()
        });
        const token = inviteResp.body.groupInvite.token;

        const response = await api.post(`/api/group/join/${token}`, {});

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Validation failed');
    });

    // Test: POST (Erstellen eines Invite-Tokens)
    test('POST Invite: Should return a GroupInvite object (Status 201)', async () => {
        const response = await api.post(`/api/group/${groupId}/invite`, {
            createdBy: playerId,
            expiresAt: new Date(Date.now() + 3600000).toISOString()
        });

        expect(response.status).toBe(201);
        expect(response.body.groupInvite.token).toBeDefined();
    });

    // Test: POST (Abgelaufenes Token)
    test('POST: Should fail if the token is expired (Status 400)', async () => {
        const expiredDate = new Date(Date.now() - 60000).toISOString();
        const inviteResp = await api.post(`/api/group/${groupId}/invite`, {
            createdBy: playerId,
            expiresAt: expiredDate
        });
        const token = inviteResp.body.groupInvite.token;
        await cleanupExpiredInvites();

        const player2Resp = await api.post('/api/player', { name: 'JoiningPlayerExpired', ...MOCK_PLAYER_DATA_FULL });
        const player2Id = player2Resp.body.player.id;

        const response = await api.post(`/api/group/join/${token}`, { playerId: player2Id });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('GroupInvite not found');
    });

    // Test: POST (Beitreten über Token)
    test('POST Join Token: Should allow a player to join the group (Status 201)', async () => {
        const inviteResp = await api.post(`/api/group/${groupId}/invite`, {
            createdBy: playerId,
            expiresAt: new Date(Date.now() + 3600000).toISOString()
        });
        const token = inviteResp.body.groupInvite.token;

        const player2Resp = await api.post('/api/player', { name: 'JoiningPlayer', ...MOCK_PLAYER_DATA_FULL });
        const player2Id = player2Resp.body.player.id;

        const response = await api.post(`/api/group/join/${token}`, { playerId: player2Id });

        expect(response.status).toBe(201);

        const listResponse = await api.get(`/api/group/${groupId}/member`);
        expect(listResponse.body.length).toBe(2);
    });
});