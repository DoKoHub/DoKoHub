import { BadResponse, ErrorResponse, GETResponse, POSTResponse } from "$lib/responses";
import { db } from "$lib/server/db";
import { playgroupMember } from "$lib/server/db/schema";
import type { Player, PlayerStatus, PlayGroupMember } from "$lib/types";
import type { RequestHandler } from "@sveltejs/kit";
import { eq } from "drizzle-orm";


export const GET: RequestHandler = async({ params }) => {
    try {
        // UUID der Gruppe
        const groupId = params.group;

        //Falls UUID leer ist
        if (!groupId) {
            return new BadResponse('PlayGroup ID required');
        }

        const members = await db
            .select()
            .from(playgroupMember)
            .where(eq(playgroupMember.groupId, groupId));

        return new GETResponse(members as PlayGroupMember[]);
    } catch(error) {
        return new ErrorResponse('Database error while fetching PlayGroupMember[]');
    }
}

export const POST: RequestHandler = async({ request, params, fetch }) => {
    try {
        // UUID der Gruppe
        const groupId = params.group;

        //Falls UUID leer ist
        if (!groupId) {
            return new BadResponse('PlayGroup ID required');
        }

        const groupResponseBody = await (await fetch(`/api/group/${groupId}`)).json();
        if (!groupResponseBody) {
            return new BadResponse('PlayGroup not found');
        }

        const body = await request.json();

        const playerId = body.playerId;
        if (!playerId) {
            return new BadResponse('Player ID required');
        }

        const player = await(await fetch(`/api/player/${playerId}`)).json() as Player;
        if (!player) {
            return new BadResponse('Player not found');
        }

        const playgroupMemberObj = {
            groupId: groupId,
            playerId: player.id,
            nickname: body.nickname ? body.nickname : player.name,
            status: "ACTIVE" as PlayerStatus
        }

        const [playgroupMemberFromDB] = await db
            .insert(playgroupMember)
            .values(playgroupMemberObj)
            .returning();

        return new POSTResponse('Created PlayGroupMember', {name: 'playGroupMember', data: playgroupMemberFromDB as PlayGroupMember});
    } catch(error) {
        return new ErrorResponse('Database error while creating PlayGroupMember');
    }
};