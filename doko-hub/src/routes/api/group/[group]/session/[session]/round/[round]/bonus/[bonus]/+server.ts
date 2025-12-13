import { badRequest, ok, serverError } from "$lib/http";
import { db } from "$lib/server/db";
import { roundBonus } from "$lib/server/db/schema";
import { RoundBonus, UUID } from "$lib/types";
import { groupExists, roundExists, sessionExists } from "$lib/utils";
import type { RequestHandler } from "@sveltejs/kit";
import { eq } from "drizzle-orm";

/**
 * 1. GET /api/group/[group]/session/[session]/round/[round]/bonus/[bonus]
 * Request: Keine
 * Response 200: RoundBonus
 * Response 400: { "message": string }
 * Response 500: { "message": string }
 * 
 * 2. PUT /api/group/[group]/session/[session]/round/[round]/bonus/[bonus]
 * Request Body:
 * {
 * "roundBonus": RoundBonus
 * }
 * Response 200: { "message": string, roundBonus: RoundBonus }
 * Response 400: { "message": string }
 * Response 500: { "message": string }
 */

/**
 * Ruft einen Bonus eines bestimmten Mitglieds an einer Runde ab
 * @param params Die URL-Parameter (groupID, sessionID, roundID, memberID).
 * @param fetch Die SvelteKit fetch-Funktion für interne API-Aufrufe zur Validierung.
 * @returns Response
 */
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

        // Prüfen ob Gruppe existiert
        if (!groupExists(groupId)) {
            return badRequest({ message: 'PlayGroup not found' });
        }

        // Prüfen ob Session existiert
        if (!sessionExists(sessionId)) {
            return badRequest({ message: 'Session not found' });
        }

        // Prüfen ob Runde existiert
        if (!roundExists(roundId)) {
            return badRequest({ message: 'Round not found' });
        }

        // Bonus aus DB abrufen
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

/**
 * Aktualisiert den Bonus eines Mitglieds an einer Runde
 * @param request Das Objekt für den Zugriff auf den Body
 * @param params URL-Parameter
 * @returns Response
 */
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

        // Prüfen ob Gruppe existiert
        if (!groupExists(groupId)) {
            return badRequest({ message: 'PlayGroup not found' });
        }

        // Prüfen ob Session existiert
        if (!sessionExists(sessionId)) {
            return badRequest({ message: 'Session not found' });
        }

        // Prüfen ob Runde existiert
        if (!roundExists(roundId)) {
            return badRequest({ message: 'Round not found' });
        }

        // Request Body validieren
        const body = await request.json();
        const newBonus = body.roundBonus;
        if (!newBonus || !(RoundBonus.safeParse(newBonus).success)) {
            return badRequest({ message: 'Valid RoundBonus required' });
        }

        // Datenbank update
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