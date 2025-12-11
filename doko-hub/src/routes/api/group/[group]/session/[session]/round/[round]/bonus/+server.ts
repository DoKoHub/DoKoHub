import { badRequest, ok, serverError } from "$lib/http";
import { db } from "$lib/server/db";
import { roundBonus, roundCall } from "$lib/server/db/schema";
import { BonusType, CallType, RoundBonus, RoundCall, UUID } from "$lib/types";
import { readValidatedBody } from "$lib/validation";
import type { RequestHandler } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import z from "zod";

/**
 * 1. GET /api/group/[group]/session/[session]/round/[round]/bonus
 * Request: Keine
 * Response 200: [RoundBonus]
 * Response 400: { "message": string }
 * Response 500: { "message": string }
 * 
 * 2. POST /api/group/[group]/session/[session]/round/[round]/bonus
 * Request Body:
 * {
 * "memberId": UUID,
 * "bonus": BonusType
 * }
 * Response 200: { "message": string, roundBonus: RoundBonus }
 * Response 400: { "message": string }
 * Response 500: { "message": string }
 */

/**
 * Ruft alle Boni ab die zu einer bestimmten Runde gehören
 * @param params URL-Parameter
 * @param fetch SvelteKit fetch-Funktion
 * @returns Response
 */
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

        // Prüfen ob Gruppe existiert
        const groupResponse = await fetch(`/api/group/${groupId}`);
        if (groupResponse.status != 200) {
            return badRequest({ message: 'PlayGroup not found' });
        }

        // Prüfen ob Session existiert
        const sessionResponse = await fetch(`/api/group/${groupId}/session/${sessionId}`);
        if (sessionResponse.status != 200) {
            return badRequest({ message: 'Session not found' });
        }

        // Prüfen ob Runde existiert
        const roundResponse = await fetch(`/api/group/${groupId}/session/${sessionId}/round/${roundId}`);
        if (roundResponse.status != 200) {
            return badRequest({ message: 'Round not found' });
        }

        // Boni aus DB abrufen
        const bonusesFromDB = await db
            .select()
            .from(roundBonus)
            .where(eq(roundBonus.roundId, roundId));

        return ok(bonusesFromDB as RoundBonus[]);
    } catch(error) {
        return serverError({ message: 'Database error while fetching RoundBonus[]' });
    }
};

/**
 * Erstellt einen neuen Bonus für ein Mitglied
 * @param event Event, enthält den Body zur validierung
 * @returns Response
 */
export const POST: RequestHandler = async(event) => {
    const bodySchema = z.object({
        memberId: UUID,
        bonus: BonusType
    });

    const { memberId, bonus } = await readValidatedBody(event, bodySchema);

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

        // Prüfen ob Gruppe existiert
        const groupResponse = await event.fetch(`/api/group/${groupId}`);
        if (groupResponse.status != 200) {
            return badRequest({ message: 'PlayGroup not found' });
        }

        // Prüfen ob Session existiert
        const sessionResponse = await event.fetch(`/api/group/${groupId}/session/${sessionId}`);
        if (sessionResponse.status != 200) {
            return badRequest({ message: 'Session not found' });
        }

        // Prüfen ob Runde existiert
        const roundResponse = await event.fetch(`/api/group/${groupId}/session/${sessionId}/round/${roundId}`);
        if (roundResponse.status != 200) {
            return badRequest({ message: 'Round not found' });
        }

        // Bonus in DB erstellen
        const [createdBonus] = await db
            .insert(roundBonus)
            .values({
                roundId: roundId,
                memberId: memberId,
                bonus: bonus
            })
            .returning();
        
        return ok({ message: 'Created RoundBonus', roundBonus: createdBonus as RoundBonus });
    } catch(error) {
        return serverError({ message: 'Database error while creating RoundBonus' });
    }
}