import { badRequest, ok, serverError } from "$lib/http";
import { db } from "$lib/server/db";
import { roundBonus, roundCall } from "$lib/server/db/schema";
import { RoundBonus, RoundCall,UUID } from "$lib/types";
import { groupExists, roundExists, sessionExists } from "$lib/utils";
import type { RequestHandler } from "@sveltejs/kit";
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

        if (!groupExists(groupId)) {
            return badRequest({ message: 'PlayGroup not found' });
        }

        if (!sessionExists(sessionId)) {
            return badRequest({ message: 'Session not found' });
        }

        if (!roundExists(roundId)) {
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

export const PUT: RequestHandler = async({ params, request }) => {
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

        if (!groupExists(groupId)) {
            return badRequest({ message: 'PlayGroup not found' });
        }

        if (!sessionExists(sessionId)) {
            return badRequest({ message: 'Session not found' });
        }

        if (!roundExists(roundId)) {
            return badRequest({ message: 'Round not found' });
        }

        const body = await request.json();
        const newBonus = body.roundBonus;
        if (!newBonus || !(RoundBonus.safeParse(newBonus).success)) {
            return badRequest({ message: 'Valid RoundBonus required' });
        }

        const [updatedBonus] = await db
            .update(roundBonus)
            .set({
                bonus: newBonus.bonus
            })
            .where(eq(roundBonus.id, bonusId))
            .returning();
        
        if (!updatedBonus) {
            return badRequest({ message: 'RoundBonus not found' });
        }

        return ok({ message: 'Updated RoundBonus', roundBonus: RoundBonus.parse(updatedBonus) })
    } catch(error) {
        return badRequest({ message: 'Database error while updating RoundBonus' });
    }
}