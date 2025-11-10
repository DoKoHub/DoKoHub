import { badRequest, serverError } from "$lib/http";
import { db } from "$lib/server/db";
import { roundParticipation, sessionMember } from "$lib/server/db/schema";
import { RoundParticipation, UUID } from "$lib/types";
import { isSessionMember } from "$lib/utils";
import type { RequestHandler } from "@sveltejs/kit";
import { ok } from "assert";
import { and, eq } from "drizzle-orm";


export const GET: RequestHandler = async({ params, fetch }) => {
    try {
        const groupId = params.group;
        const sessionId = params.session;
        const roundId = params.round;
        const playerId = params.participation;

        if (!groupId || !(UUID.safeParse(groupId)).success) {
            return badRequest({ message: 'PlayGroup ID required' });
        }

        if (!sessionId || !(UUID.safeParse(sessionId)).success) {
            return badRequest({ message: 'Session ID required' });
        }

        if (!roundId || !(UUID.safeParse(roundId)).success) {
            return badRequest({ message: 'Round ID required' });
        }

        if (!playerId || !(UUID.safeParse(playerId)).success) {
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

        if (!isSessionMember(sessionId, playerId)) {
            return badRequest({ message: 'SessionMember not found' });
        }

        const [participation] = await db
            .select()
            .from(roundParticipation)
            .where(and(
                eq(roundParticipation.roundId, roundId),
                eq(roundParticipation.playerId, playerId)
            ));
        
        if (!participation) {
            return badRequest({ message: 'RoundParticipation not found' });
        }

        return ok(participation as RoundParticipation);
    } catch(error) {
        return serverError({ message: 'Database error while fetching RoundParticipation' });
    }
}