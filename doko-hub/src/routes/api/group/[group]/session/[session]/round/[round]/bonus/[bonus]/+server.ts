import { badRequest, serverError } from "$lib/http";
import { db } from "$lib/server/db";
import { roundBonus, roundCall } from "$lib/server/db/schema";
import { RoundBonus, RoundCall,UUID } from "$lib/types";
import type { RequestHandler } from "@sveltejs/kit";
import { ok } from "assert";
import { eq } from "drizzle-orm";


export const GET: RequestHandler = async({ params, fetch }) => {
    try {
        const groupId = params.group;
        const sessionId = params.session;
        const roundId = params.round;
        const bonusId = params.bonus;

        if (!groupId || !(UUID.safeParse(groupId)).success) {
            return badRequest({ message: 'PlayGroup ID required' });
        }

        if (!sessionId || !(UUID.safeParse(sessionId)).success) {
            return badRequest({ message: 'Session ID required' });
        }

        if (!roundId || !(UUID.safeParse(roundId)).success) {
            return badRequest({ message: 'Round ID required' });
        }

        if (!bonusId || !(UUID.safeParse(bonusId)).success) {
            return badRequest({ message: 'Player ID required' });
        }

        const groupResponse = await fetch(`/api/group/${groupId}`);
        if (groupResponse.status != 200) {
            return badRequest({ message: 'PlayGroup not found' });
        }

        const sessionResponse = await fetch(`/api/group/${groupId}/session/${sessionId}`);
        if (sessionResponse.status != 200) {
            return badRequest({ message: 'Session not found' });
        }

        const roundResponse = await fetch(`/api/group/${groupId}/session/${sessionId}/round/${roundId}`);
        if (roundResponse.status != 200) {
            return badRequest({ message: 'Round not found' });
        }

        const [bonus] = await db
            .select()
            .from(roundBonus)
            .where(eq(roundBonus.id, bonusId));
        
        if (!bonus) {
            return badRequest({ message: 'RoundBonus not found' });
        }

        return ok(bonus as RoundBonus);
    } catch(error) {
        return serverError({ message: 'Database error while fetching RoundBonus' });
    }
}