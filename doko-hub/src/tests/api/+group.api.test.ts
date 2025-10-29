import { api } from '../setup/+api';
import { setupDatabase } from '../setup/+setup';
import { db } from '$lib/server/db';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { Sql } from 'postgres';
import { cleanupExpiredInvites } from '$lib/server/cleanup-invites';

// Mock data
const NON_EXISTENT_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

afterAll(async () => {
    const rawClient = (db as PostgresJsDatabase<any> & { $client: Sql<any> }).$client;

    if (rawClient && rawClient.end) {
        await rawClient.end();
    }
});

// Tests für /api/group (GET & POST)

describe('API /api/group', () => {
    beforeEach(setupDatabase);

    // Test: GET (Liste von allen Gruppen)
    test('GET: Should return a list of all PlayGroup objects (Status 200)', async () => {
        await api.post('/api/group', { name: 'GroupA' });
        await api.post('/api/group', { name: 'GroupB' });

        const response = await api.get('/api/group');
        expect(response.status).toBe(200);
        expect(response.body.length).toBe(2);
    });

    // Test: POST (Name kein String)
    test('POST: Should fail if "name" is not a string (Status 400)', async () => {
        const response = await api.post('/api/group', { name: 1001 });
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Name is required and must be a string');
    });

    // Test: POST (Anlegen einer neuen Gruppe)
    test('POST: Should successfully create a new PlayGroup (Status 201)', async () => {
        const groupName = 'NewGamingGroup';
        const response = await api.post('/api/group', { name: groupName });

        expect(response.status).toBe(201);
        expect(response.body.message).toBe('Group created');
        expect(response.body.playGroup.name).toBe(groupName);
    });

    // Test: POST (Name ist leer)
    test('POST: Should fail if "name" is empty (Status 400)', async () => {
        const response = await api.post('/api/group', { name: '  ' });
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Name is required and must be a string');
    });
});

// Tests für /api/group/[group] (GET, PUT, DELETE)

describe('API /api/group/[group]', () => {
    let createdGroupId: string;

    beforeEach(async () => {
        await setupDatabase();
        const response = await api.post('/api/group', { name: 'GroupToManage' });
        createdGroupId = response.body.playGroup.id;
    });

    // Test: GET (ungültiges ID-Format)
    test('GET: Should return 500 if group ID has an invalid format', async () => {
        const response = await api.get('/api/group/not-a-valid-uuid');
        expect(response.status).toBe(500);
        expect(response.body.error).toBe('Database error while fetching group \"not-a-valid-uuid\"');
    });

    // Test: GET (Abfrage einer spezifischen Gruppe)
    test('GET: Should return the specific PlayGroup object (Status 200)', async () => {
        const response = await api.get(`/api/group/${createdGroupId}`);
        expect(response.status).toBe(200);
    });

    // Test: GET (Gruppe existiert nicht)
    test('GET: Should return 400 if group ID is not found', async () => {
        const response = await api.get(`/api/group/${NON_EXISTENT_ID}`);
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Group not found');
    });

    // Test: PUT (PlayGroup-Objekt fehlt)
    test('PUT: Should fail if playGroup object is missing in body (Status 400)', async () => {
        const response = await api.put(`/api/group/${createdGroupId}`, { name: 'Directly in body' });
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Must send a valid PlayGroup');
    });

    // Test: PUT (Leerer Name im PlayGroup-Objekt)
    test('PUT: Should fail if "name" is an empty string in playGroup (Status 400)', async () => {
        const updateData = { name: '  ' };
        const response = await api.put(`/api/group/${createdGroupId}`, { playGroup: updateData });
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Name is required and must be a string');
    });

    // Test: PUT (Aktualisierung des Gruppennamens und der Notiz)
    test('PUT: Should successfully update name, lastPlayedOn and note (Status 200)', async () => {
        const updateData = { name: 'RenamedGroup', note: 'New note' };
        const response = await api.put(`/api/group/${createdGroupId}`, { playGroup: updateData });

        expect(response.status).toBe(200);
        expect(response.body.playGroup.name).toBe(updateData.name);
    });

    // Test: DELETE (Gruppe existiert nicht)
    test('DELETE: Should return 400 if group ID is not found', async () => {
        const response = await api.delete(`/api/group/${NON_EXISTENT_ID}`);
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Group not found');
    });

    // Test: DELETE (ungültiges ID-Format)
    test('DELETE: Should return 500 if group ID has an invalid format', async () => {
        const response = await api.delete('/api/group/invalid-uuid-to-delete');
        expect(response.status).toBe(500);
        expect(response.body.error).toBe('Database error while deleting group');
    });

    // Test: DELETE (Löschen einer Gruppe)
    test('DELETE: Should successfully delete the PlayGroup (Status 200)', async () => {
        const response = await api.delete(`/api/group/${createdGroupId}`);
        expect(response.status).toBe(200);

        // Überprüfen ob die Gruppe wirklich gelöscht wurde
        const getResponse = await api.get(`/api/group/${createdGroupId}`);
        expect(getResponse.status).toBe(400);
        expect(getResponse.body.error).toBe('Group not found');
    });

    // Test: DELETE (Gruppe existiert nicht)
    test('DELETE: Should return 400 if group ID is not found', async () => {
        const response = await api.delete(`/api/group/${NON_EXISTENT_ID}`);
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Group not found');
    });
});

// Tests für /api/group/member & /api/group/invite/join

describe('API /api/group/member & /api/group/invite/join', () => {
    let groupId: string;
    let playerId: string;
    let memberId: string;

    beforeEach(async () => {
        await setupDatabase();

        const groupResp = await api.post('/api/group', { name: 'MemberTestGroup' });
        groupId = groupResp.body.playGroup.id;

        const playerResp = await api.post('/api/player', { name: 'Player1' });
        playerId = playerResp.body.player.id;

        const memberResp = await api.post(`/api/group/${groupId}/member`, { playerId: playerId });
        memberId = memberResp.body.playGroupMember.playerId;
    });

    // Tests für /api/group/[group]/member

    // Test: POST (Spieler existiert bereits)
    test('POST Member: Should fail if Player is already a member (Status 500)', async () => {
        const response = await api.post(`/api/group/${groupId}/member`, { playerId: playerId });

        expect(response.status).toBe(500);
        expect(response.body.error).toBe('Database error while creating group member');
    });

    // Test: POST (Spieler-ID fehlt)
    test('POST Member: Should fail if playerId is missing (Status 400)', async () => {
        const response = await api.post(`/api/group/${groupId}/member`, {});

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Player ID required');
    });

    // Test: POST Member (Gruppe existiert nicht)
    test('POST Member: Should fail if Group ID does not exist (Status 500)', async () => {
        const response = await api.post(`/api/group/${NON_EXISTENT_ID}/member`, { playerId: playerId });

        expect(response.status).toBe(500);
        expect(response.body.error).toBe('Database error while creating group member');
    });

    // Test: POST Member (Spieler existiert nicht)
    test('POST Member: Should fail if Player ID does not exist (Status 500)', async () => {
        const response = await api.post(`/api/group/${groupId}/member`, { playerId: NON_EXISTENT_ID });

        expect(response.status).toBe(500);
        expect(response.body.error).toBe('Database error while creating group member');
    });

    // Test: POST (Hinzufügen eines Spielers)
    test('POST Member: Should successfully add a Player to the group (Status 201)', async () => {
        const player2Resp = await api.post('/api/player', { name: 'NewMember' });
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
        const response = await api.put(`/api/group/${groupId}/member/${NON_EXISTENT_ID}`, {
            playGroupMember: { nickname: newNickname }
        });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Member not found');
    });

    // Test: PUT (playGroupMember-Objekt fehlt)
    test('PUT Member: Should fail if playGroupMember object is missing (Status 400)', async () => {
        const response = await api.put(`/api/group/${groupId}/member/${memberId}`, {});

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('New playGroupMember Object needed');
    });

    // Test: PUT (Aktualisieren des Nicknames)
    test('PUT Member: Should successfully update nickname (Status 200)', async () => {
        const newNickname = 'TheLeader';
        const response = await api.put(`/api/group/${groupId}/member/${memberId}`, {
            playGroupMember: { nickname: newNickname }
        });

        expect(response.status).toBe(200);
        expect(response.body.playGroupMember.nickname).toBe(newNickname);
    });

    // Test: DELETE (Spieler-ID existiert nicht)
    test('DELETE Member: Should fail if member ID does not exist (Status 400)', async () => {
        const response = await api.delete(`/api/group/${groupId}/member/${NON_EXISTENT_ID}`);

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Member not found');
    });

    // Test: DELETE (Löschen eines Spielers)
    /*test('DELETE Member: Should successfully delete the PlayGroupMember (Status 200)', async () => {
        const response = await api.delete(`/api/group/${groupId}/member/${memberId}`);
        expect(response.status).toBe(200);

        // Überprüfen ob das Mitglied wirklich gelöscht wurde
        const listResponse = await api.get(`/api/group/${groupId}/member`);
        expect(listResponse.body.length).toBe(0);
    });*/

    // Tests für /api/group/[group]/invite & /api/group/join/[token]

    // Test: POST (playerId fehlt)
    test('POST Invite: Should fail if createdBy (playerId) is missing (Status 400)', async () => {
        const response = await api.post(`/api/group/${groupId}/invite`, {
            expiresAt: new Date(Date.now() + 3600000).toISOString()
        });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Expire date and creating player ID needed');
    });

    // Test: POST (ungültiges Tokenformat)
    test('POST Join Token: Should fail with invalid token format (Status 400)', async () => {
        const player2Resp = await api.post('/api/player', { name: 'JoiningPlayer2' });
        const player2Id = player2Resp.body.player.id;

        const response = await api.post('/api/group/join/not-a-valid-token-format', { playerId: player2Id });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Invite from token not found (expired?)');
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
        expect(response.body.error).toBe('Player ID needed!');
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

        const player2Resp = await api.post('/api/player', { name: 'JoiningPlayerExpired' });
        const player2Id = player2Resp.body.player.id;

        const response = await api.post(`/api/group/join/${token}`, { playerId: player2Id });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Invite from token not found (expired?)');
    });

    // Test: POST (Beitreten über Token)
    test('POST Join Token: Should allow a player to join the group (Status 201)', async () => {
        const inviteResp = await api.post(`/api/group/${groupId}/invite`, {
            createdBy: playerId,
            expiresAt: new Date(Date.now() + 3600000).toISOString()
        });
        const token = inviteResp.body.groupInvite.token;

        const player2Resp = await api.post('/api/player', { name: 'JoiningPlayer' });
        const player2Id = player2Resp.body.player.id;

        const response = await api.post(`/api/group/join/${token}`, { playerId: player2Id });

        expect(response.status).toBe(201);

        const listResponse = await api.get(`/api/group/${groupId}/member`);
        expect(listResponse.body.length).toBe(2);
    });
});