import { badRequest, ok, serverError } from "$lib/http";
import { db } from "$lib/server/db";
import { round } from "$lib/server/db/schema";
import { Round, UUID } from "$lib/types";
import type { RequestHandler } from "@sveltejs/kit";
import { eq } from "drizzle-orm";


export const GET: RequestHandler = async({ params, fetch }) => {
    try {
        const groupId = params.group;
        const sessionId = params.session;
        const roundId = params.round;

        if (!groupId || !(UUID.safeParse(groupId)).success) {
            return badRequest({ message: 'PlayGroup ID required' });
        }

        if (!sessionId || !(UUID.safeParse(sessionId)).success) {
            return badRequest({ message: 'Session ID required' });
        }

        if (!roundId || !(UUID.safeParse(roundId)).success) {
            return badRequest({ message: 'Round ID required' });
        }

        const groupResponse = await fetch(`/api/group/${groupId}`);
        if (groupResponse.status != 200) {
            return badRequest({ message: 'PlayGroup not found' });
        }

        const sessionResponse = await fetch(`/api/group/${groupId}/session/${sessionId}`);
        if (sessionResponse.status != 200) {
            return badRequest({ message: 'Session not found' });
        }

        const [roundFromDB] = await db
            .select()
            .from(round)
            .where(eq(round.id, roundId));

        if (!roundFromDB) {
            return badRequest({ message: 'Round not found' });
        }

        return ok(roundFromDB as Round);
    } catch(error) {
        return serverError({ message: 'Database error while fetching Round' });
    }
};

export const PUT: RequestHandler = async({ request, params, fetch}) => {
    try {
        const groupId = params.group;
        const sessionId = params.session;
        const roundId = params.round;

        if (!groupId || !(UUID.safeParse(groupId)).success) {
            return badRequest({ message: 'PlayGroup ID required' });
        }

        if (!sessionId || !(UUID.safeParse(sessionId)).success) {
            return badRequest({ message: 'Session ID required' });
        }

        if (!roundId || !(UUID.safeParse(roundId)).success) {
            return badRequest({ message: 'Round ID required' });
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

        const body = await request.json();
        const roundObj = body.round;
        if (!roundObj || !(Round.safeParse(roundObj)).success) {
            return badRequest({ message: 'Round required' });
        }

        const [updatedRound] = await db
            .update(round)
            .set(roundObj)
            .where(eq(round.id, roundId))
            .returning();

        if (!updatedRound) {
            return badRequest({ message: 'Round not found' });
        }

        return ok({ message: 'Updated Round', round: updatedRound as Round })
    } catch(error) {
        return serverError({ message: 'Database error while updating Round' });
    }
}