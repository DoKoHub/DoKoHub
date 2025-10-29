import { BadResponse, ErrorResponse, POSTResponse } from "$lib/responses";
import { db } from "$lib/server/db";
import { groupInvite } from "$lib/server/db/schema";
import type { GroupInvite, PlayGroup, PlayGroupMember } from "$lib/types";
import type { RequestHandler } from "@sveltejs/kit";
import { eq } from "drizzle-orm";


export const POST: RequestHandler = async({ request, params, fetch }) => {
    try {
        const token = params.token

        if (!token) {
            return new BadResponse('Token needed');
        }

        const body = await request.json();
        const playerId = body.playerId;

        if (!playerId) {
            return new BadResponse('Player ID needed!');
        }

        const invite = await db
            .select()
            .from(groupInvite)
            .where(eq(groupInvite.token, token));

        if (!invite[0]) {
            return new BadResponse('Invite from token not found (expired?)');
        }

        const groupInviteObj = invite[0] as GroupInvite;
        const group = (await(await fetch(`/api/group/${groupInviteObj.groupId}`)).json()) as PlayGroup;

        if (!group) {
            return new BadResponse('Group not found');
        }

        const addResponse = await fetch(`/api/group/${group.id}/member`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                playerId: playerId,
                ...(body.nickname ? {nickname: body.nickname} : {})
            })
        });

        const addBody = await addResponse.json();

        return new POSTResponse('Player joined group', {name: 'playGroupMember', data: addBody.playGroupMember as PlayGroupMember})
    } catch(error) {
        return new ErrorResponse('Database error while joining group');
    }
};