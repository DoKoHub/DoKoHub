import type { RequestHandler } from "@sveltejs/kit";

import { UUID as UUIDSchema, type UUID as UUIDBrand, NonEmpty, PlayGroup } from "$lib/types";
import { badRequest, ok, serverError } from "$lib/http";
import { db } from "$lib/server/db";
import { playgroup, playgroupMember } from "$lib/server/db/schema";
import { and, eq, ne } from "drizzle-orm";

export const GET: RequestHandler = async({ params, fetch }) => {
    try {
        const playerID = params.player;
        if (!playerID) {
            return badRequest({ message: 'Player ID required' });
        }

        const parsed = UUIDSchema.safeParse(playerID);
        if (!parsed.success) {
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

        const playGroups: PlayGroup[] = result as PlayGroup[];
        return ok(playGroups);
    } catch(error) {
        return serverError({ message: 'Database error while fetching PlayGroup[] of Player' });
    }
}