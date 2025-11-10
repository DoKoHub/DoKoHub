import { badRequest, ok, serverError } from "$lib/http";
import { db } from "$lib/server/db";
import { round, roundParticipation } from "$lib/server/db/schema";
import { RoundParticipation, SeatPos, Side, UUID } from "$lib/types";
import { readValidatedBody } from "$lib/validation";
import type { RequestHandler } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import z from "zod";


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

        const roundResponse = await fetch(`/api/group/${groupId}/session/${sessionId}/round/${roundId}`);
        if (roundResponse.status != 200) {
            return badRequest({ message: 'Round not found' });
        }

        const participationsFromDB = await db
            .select()
            .from(roundParticipation)
            .where(eq(roundParticipation.roundId, roundId));

        return ok(participationsFromDB as RoundParticipation[]);
    } catch(error) {
        return serverError({ message: 'Database error while fetching RoundParticipation[]' });
    }
};

export const POST: RequestHandler = async(event) => {
    const bodySchema = z.object({
        playerId: UUID,
        side: Side,
        seatPos: SeatPos
    });

    const { playerId, side, seatPos } = await readValidatedBody(event, bodySchema);

    try {

        const groupId = event.params.group;
        const sessionId = event.params.session;
        const roundId = event.params.round;

        if (!groupId || !(UUID.safeParse(groupId)).success) {
            return badRequest({ message: 'PlayGroup ID required' });
        }

        if (!sessionId || !(UUID.safeParse(sessionId)).success) {
            return badRequest({ message: 'Session ID required' });
        }

        if (!roundId || !(UUID.safeParse(roundId)).success) {
            return badRequest({ message: 'Round ID required' });
        }

        const groupResponse = await event.fetch(`/api/group/${groupId}`);
        if (groupResponse.status != 200) {
            return badRequest({ message: 'PlayGroup not found' });
        }

        const sessionResponse = await event.fetch(`/api/group/${groupId}/session/${sessionId}`);
        if (sessionResponse.status != 200) {
            return badRequest({ message: 'Session not found' });
        }

        const roundResponse = await event.fetch(`/api/group/${groupId}/session/${sessionId}/round/${roundId}`);
        if (roundResponse.status != 200) {
            return badRequest({ message: 'Round not found' });
        }

        const [createdparticipation] = await db
            .insert(roundParticipation)
            .values({
                roundId: roundId,
                playerId: playerId,
                side: side,
                seatPos: seatPos
            })
            .returning();
        
        return ok({ message: 'Created RoundParticipation', roundParticipation: createdparticipation as RoundParticipation });
    } catch(error) {
        return serverError({ message: 'Database error while creating RoundParticipation' });
    }
}