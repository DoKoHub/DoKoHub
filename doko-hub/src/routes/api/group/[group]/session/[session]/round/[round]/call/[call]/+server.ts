import { badRequest, serverError, ok } from "$lib/http";
import { db } from "$lib/server/db";
import { roundCall } from "$lib/server/db/schema";
import { RoundCall,UUID } from "$lib/types";
import { groupExists, roundExists, sessionExists } from "$lib/utils";
import type { RequestHandler } from "@sveltejs/kit";
import { eq } from "drizzle-orm";

/**
 * 1. GET /api/group/[group]/session/[session]/round/[round]/call/[call]
 * Request: Keine
 * Response 200: RoundCall
 * Response 400: { "message": string }
 * Response 500: { "message": string }
 * 
 * 2. PUT /api/group/[group]/session/[session]/round/[round]/call/[call]
 * Request Body:
 * {
 * "roundCall": RoundCall
 * }
 * Response 200: { "message": string, roundCall: RoundCall }
 * Response 400: { "message": string }
 * Response 500: { "message": string }
 */

/**
 * Ruft einen Call eines bestimmten Mitglieds an einer Runde ab
 * @param params Die URL-Parameter (groupID, sessionID, roundID, memberID).
 * @param fetch Die SvelteKit fetch-Funktion für interne API-Aufrufe zur Validierung.
 * @returns Response
 */
export const GET: RequestHandler = async({ params, fetch }) => {
    try {
        const groupId = params.group;
        const sessionId = params.session;
        const roundId = params.round;
        const callId = params.call;

        if (!groupId || !(UUID.safeParse(groupId)).success) {
            return badRequest({ message: 'PlayGroup ID required' });
        }

        if (!sessionId || !(UUID.safeParse(sessionId)).success) {
            return badRequest({ message: 'Session ID required' });
        }

        if (!roundId || !(UUID.safeParse(roundId)).success) {
            return badRequest({ message: 'Round ID required' });
        }

        if (!callId || !(UUID.safeParse(callId)).success) {
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

        // Call aus DB abrufen
        const [call] = await db
            .select()
            .from(roundCall)
            .where(eq(roundCall.id, callId));
        
        if (!call) {
            return badRequest({ message: 'RoundCall not found' });
        }

        return ok(call as RoundCall);
    } catch(error) {
        return serverError({ message: 'Database error while fetching RoundCall' });
    }
}

/**
 * Aktualisiert den Call eines Mitglieds an einer Runde
 * @param request Das Objekt für den Zugriff auf den Body
 * @param params URL-Parameter
 * @returns Response
 */
export const PUT: RequestHandler = async({ params, request }) => {
    try {
        const groupId = params.group;
        const sessionId = params.session;
        const roundId = params.round;
        const callId = params.call;

        if (!groupId || !(UUID.safeParse(groupId)).success) {
            return badRequest({ message: 'PlayGroup ID required' });
        }

        if (!sessionId || !(UUID.safeParse(sessionId)).success) {
            return badRequest({ message: 'Session ID required' });
        }

        if (!roundId || !(UUID.safeParse(roundId)).success) {
            return badRequest({ message: 'Round ID required' });
        }

        if (!callId || !(UUID.safeParse(callId)).success) {
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
        const newCall = body.roundCall;
        if (!newCall || !(RoundCall.safeParse(newCall).success)) {
            return badRequest({ message: 'Valid RoundCall required' });
        }

        // Datenbank update
        const [updatedCall] = await db
            .update(roundCall)
            .set({
                call: newCall.call
            })
            .where(eq(roundCall.id, callId))
            .returning();
        
        if (!updatedCall || !(RoundCall.safeParse(updatedCall).success)) {
            return badRequest({ message: 'RoundCall not found' });
        }

        return ok({ message: 'Updated RoundCall', roundCall: RoundCall.parse(updatedCall) });
    } catch(error) {
        return badRequest({ message: 'Database error while updating RoundCall' })
    }
}