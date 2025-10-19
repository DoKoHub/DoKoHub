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

        // Gesammelte Objekte in type Player umwandeln
        const players: Player[] = playersFromDB as Player[];

        // Liste zurueckgeben
        return new Response(
            JSON.stringify(players), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    } catch(error) {
        // Falls die DB einen Fehler wirft
        return new Response(
            JSON.stringify({  
                error: 'Database error while fetching players',
                details: error instanceof Error? error.message : String(error)
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
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
            return new Response(
                JSON.stringify({
                    error: 'name is required and must be a string.'
                }), {
                    status: 400
                }
            );
        }

        // Spieler in DB schreiben und erstelltes Objekt speichern
        const [insertedPlayer] = await db
            .insert(player)
            .values({ name })
            .returning();
        // Umwandeln in type Player
        const returnPlayer: Player = {
            id: insertedPlayer.id,
            name: insertedPlayer.name
        }

        // OK und Spieler zurueckgeben
        return new Response(
            JSON.stringify({
                message: 'Player created',
                player: returnPlayer
            }), {
                status: 201,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    } catch(error) {
        // Falls die DB einen Fehler wirft
        return new Response(
            JSON.stringify({  
                error: 'Database error while creating player',
                details: error instanceof Error? error.message : String(error)
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}