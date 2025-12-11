import { badRequest, ok, serverError } from "$lib/http";
import { db } from "$lib/server/db";
import { round } from "$lib/server/db/schema";
import { Round, UUID } from "$lib/types";
import type { RequestHandler } from "@sveltejs/kit";
import { eq } from "drizzle-orm";

/**
 * 1. GET /api/group/[group]/session/[session]/round/[round]
 * Request: Keine
 * Response 200: Round
 * Response 400: { "message": string }
 * Response 500: { "message": string }
 * 
 * 2. PUT /api/group/[group]/session/[session]/round/[round]
 * Request Body:
 * {
 * "round": Round
 * }
 * Response 200: { "message": string, round: Round }
 * Response 400: { "message": string }
 * Response 500: { "message": string }
 */

/**
 * Ruft eine einzelne Runde ab die zu einer bestimmten Session gehört
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

        // Runde aus DB abrufen
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

/**
 * Aktualisiert die Daten einer bestehenden Runde.
 * @param request Das Objekt für den Zugriff auf den Body
 * @param params URL-Parameter
 * @param fetch SvelteKit fetch-Funktion
 * @returns Response
 */
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

        // Request Body validieren
        const body = await request.json();
        const roundObj = body.round;
        if (!roundObj || !(Round.safeParse(roundObj).success)) {
            return badRequest({ message: 'Round required', roundObj});
        }

        // Datenbank update
        const [updatedRound] = await db
            .update(round)
            .set({
                soloKind: roundObj.soloKind,
                roundNum: roundObj.roundNum,
                gameType: roundObj.gameType,
                eyesRe: roundObj.eyesRe,
            })
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