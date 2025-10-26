import { api } from '../setup/+api';
import { setupDatabase } from '../setup/+setup';
import { db } from '$lib/server/db'; 
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { Sql } from 'postgres';

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

    test('GET: Should return a list of all PlayGroup objects (Status 200)', async () => {
        await api.post('/api/group', { name: 'GroupA' });
        await api.post('/api/group', { name: 'GroupB' });
        
        const response = await api.get('/api/group');
        expect(response.status).toBe(200);
        expect(response.body.length).toBe(2);
    });

    test('POST: Should successfully create a new PlayGroup (Status 201)', async () => {
        const groupName = 'NewGamingGroup';
        const response = await api.post('/api/group', { name: groupName });

        expect(response.status).toBe(201);
        expect(response.body.message).toBe('Group created');
        expect(response.body.playGroup.name).toBe(groupName);
    });

    test('POST: Should fail if "name" is missing or empty (Status 400)', async () => {
        const response = await api.post('/api/group', { name: '  ' });
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('name is required and must be a string.');
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

    test('GET: Should return the specific PlayGroup object (Status 200)', async () => {
        const response = await api.get(`/api/group/${createdGroupId}`);
        expect(response.status).toBe(200);
    });

    test('GET: Should return 400 if group ID is not found', async () => {
        const response = await api.get(`/api/group/${NON_EXISTENT_ID}`);
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Group not found');
    });

    test('PUT: Should successfully update name, lastPlayedOn and note (Status 200)', async () => {
        const updateData = { name: 'RenamedGroup', note: 'New note' };
        const response = await api.put(`/api/group/${createdGroupId}`, { playGroup: updateData });

        expect(response.status).toBe(200);
        expect(response.body.playGroup.name).toBe(updateData.name);
    });

    test('DELETE: Should successfully delete the PlayGroup (Status 200)', async () => {
        const response = await api.delete(`/api/group/${createdGroupId}`);
        expect(response.status).toBe(200);

        const getResponse = await api.get(`/api/group/${createdGroupId}`);
        expect(getResponse.status).toBe(400);
        expect(getResponse.body.error).toBe('Group not found');
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
    
    test('POST /member: Should successfully add a Player to the group (Status 201)', async () => {
        const player2Resp = await api.post('/api/player', { name: 'NewMember' });
        const player2Id = player2Resp.body.player.id;
        
        const response = await api.post(`/api/group/${groupId}/member`, { playerId: player2Id });

        expect(response.status).toBe(201);
        expect(response.body.playGroupMember.playerId).toBe(player2Id); 
    });
    
    test('GET /member: Should return a list of PlayGroupMember objects (Status 200)', async () => {
        const response = await api.get(`/api/group/${groupId}/member`);
        expect(response.status).toBe(200);
        expect(response.body.length).toBe(1); // Enthält nur den initialen Player1
        expect(response.body[0].playerId).toBe(playerId);
    });

    // Tests für /api/group/[group]/member/[member]

    test('PUT /member/[member]: Should successfully update nickname (Status 200)', async () => {
        const newNickname = 'TheLeader';
        const response = await api.put(`/api/group/${groupId}/member/${memberId}`, { 
             playGroupMember: { nickname: newNickname }
        });
        
        expect(response.status).toBe(200);
        expect(response.body.playGroupMember.nickname).toBe(newNickname);
    });

    test('DELETE /member/[member]: Should successfully delete the PlayGroupMember (Status 200)', async () => {
        const response = await api.delete(`/api/group/${groupId}/member/${memberId}`);
        expect(response.status).toBe(200);
        
        const listResponse = await api.get(`/api/group/${groupId}/member`);
        expect(listResponse.body.length).toBe(0);
    });

    // Tests für /api/group/[group]/invite & /api/group/join/[token]

    test('POST /invite: Should return a GroupInvite object (Status 201)', async () => {
        const response = await api.post(`/api/group/${groupId}/invite`, {
            createdBy: playerId,
            expiresAt: new Date(Date.now() + 3600000).toISOString() 
        });
        
        expect(response.status).toBe(201);
        expect(response.body.groupInvite.token).toBeDefined();
    });

    test('POST /join/[token]: Should allow a player to join the group (Status 201)', async () => {
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