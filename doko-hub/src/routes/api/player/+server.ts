import { BadResponse, ErrorResponse, GETResponse, POSTResponse } from "$lib/responses";
import { db } from "$lib/server/db";
import { player } from "$lib/server/db/schema";
import { PlayerZod, type Player } from "$lib/types";
import type { RequestHandler } from "@sveltejs/kit";
import { ZodError } from "zod";

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
        return new ErrorResponse('Database error while fetching Player[]')
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
            return new BadResponse('Name required and must be a string');
        }

        // Spieler in DB schreiben und erstelltes Objekt speichern
        const [insertedPlayer] = await db
            .insert(player)
            .values({ name })
            .returning();

        const playerObj = PlayerZod.safeParse(insertedPlayer);

        if (!playerObj.success) {
            return new BadResponse('Could not parse Player');
        }

        // OK und Spieler zurueckgeben
        return new POSTResponse('Created Player', { name: 'player', data: playerObj })
    } catch(error) {
        if (error instanceof ZodError) {
            return new ErrorResponse('Zod error while parsing Player')
        }

        // Falls die DB einen Fehler wirft
        return new ErrorResponse('Database error while creating Player')
    }
}