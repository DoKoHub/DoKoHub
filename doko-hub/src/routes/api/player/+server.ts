import { BadResponse, ErrorResponse, GETResponse, POSTResponse } from "$lib/responses";
import { db } from "$lib/server/db";
import { player } from "$lib/server/db/schema";
import type { Player } from "$lib/types";
import type { RequestHandler } from "@sveltejs/kit";

/**
 * Schnittstelle die alle Spieler zurueckgibt
 * 
 * @returns Response
 */
export const GET: RequestHandler = async() => {
    try {
        // Alle Spieler aus der DB abfragen
        const playersFromDB = await db
            .select()
            .from(player);

        // Liste zurueckgeben
        return new GETResponse(playersFromDB as Player[]);
    } catch(error) {
        return new ErrorResponse('Database error while fetching players', error)
    }
    
};

/**
 * Speichert neuen Spieler in der DB
 * 
 * @param request 
 * @returns Response
 */
export const POST: RequestHandler = async({ request }) => {
    try {
        // Request body
        const body = await request.json();

        // Name ueberpruefen
        const name = body.name;
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            // Name ist nicht valide
            return new BadResponse('name is required and must be a string.');
        }

        // Spieler in DB schreiben und erstelltes Objekt speichern
        const [insertedPlayer] = await db
            .insert(player)
            .values({ name })
            .returning();

        // OK und Spieler zurueckgeben
        return new POSTResponse('Player created', { name: 'player', data: insertedPlayer as Player })
    } catch(error) {
        // Falls die DB einen Fehler wirft
        return new ErrorResponse('Database error while creating player', error)
    }
}