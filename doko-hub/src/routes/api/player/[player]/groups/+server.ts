import type { RequestHandler } from "@sveltejs/kit";

import { UUID as UUIDSchema, type UUID as UUIDBrand, NonEmpty, PlayGroup, UUID, Name, PlayGroupMember } from "$lib/types";
import { badRequest, ok, serverError } from "$lib/http";
import { db } from "$lib/server/db";
import { playgroup, playgroupMember } from "$lib/server/db/schema";
import { and, eq, ne } from "drizzle-orm";

export const GET: RequestHandler = async({ params, fetch }) => {
    try {
        const playerID = params.player;
        if (!playerID || !(UUID.safeParse(playerID).success)) {
            return badRequest({ message: 'Player ID required' });
        }

        const playerResponse = await fetch(`/api/player/${playerID}`);
        if (playerResponse.status != 200) {
            return badRequest({ message: 'Player not found' });
        }

        const groups = await db
            .select()
            .from(playgroup)
            .innerJoin(playgroupMember, eq(playgroup.id, playgroupMember.groupId))
            .where(and(
                eq(playgroupMember.playerId, playerID),
                ne(playgroupMember.status, "LEFT")
            ));

        const result = groups.map(item => item.playgroup);
        
        let groupsToSend: PlayGroup[] = []; 
        for (let i = 0; i < result.length; i++) {
            const group = result[i];

            const memberResponse = await fetch(`/api/group/${group.id}/member`);
            const body = await memberResponse.json();

            const playGroup: PlayGroup = {
                id: group.id as UUID,
                name: group.name as Name,
                createdOn: group.createdOn ? new Date(group.createdOn) : null,
                lastPlayedOn: group.lastPlayedOn ? new Date(group.lastPlayedOn) : null,
                members: body as PlayGroupMember[]
            }
            groupsToSend.push(playGroup);
        }

        return ok(groupsToSend);
    } catch(error) {
        return serverError({ message: 'Database error while fetching PlayGroup[] of Player' });
    }
}