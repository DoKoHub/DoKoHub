import { db } from "$lib/server/db";
import { player } from "$lib/server/db/schema";
import type { Player } from "$lib/types";
import type { RequestHandler } from "@sveltejs/kit";
import { eq } from "drizzle-orm";

/**
 * Einzelnen Spieler anhand der UUID zurueckgeben
 * 
 * @param params 
 * @returns Response
 */
export const GET: RequestHandler = async({ params }) => {
    try {
        // Player ID aus der URL
        const playerID = params.player;
        //Falls UUID leer ist
        if (!playerID) {
            return new Response(
                JSON.stringify({ error: 'Missing player id' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        // Alle möglichen Spieler aus DB sammeln
        const playersFromDB = await db
            .select()
            .from(player)
            .where(eq(player.id, playerID));

        if(!playersFromDB || !playersFromDB[0]) {
            return new Response(
                JSON.stringify({ error: 'Player not found' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        const selected = playersFromDB[0];

        // Erstes Objekt der Liste nehmen und in type Player umwandeln
        const playerObj: Player = selected as Player;

        // OK und Spieler zurueckgeben
        return new Response(
            JSON.stringify(playerObj), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    } catch(error) {
        // Falls die DB einen Fehler wirft
        return new Response(
            JSON.stringify({  
                error: `Database error while fetching player "${params.player}"`,
                details: error instanceof Error? error.message : String(error)
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }

};

export const PUT: RequestHandler = async({ request, params}) => {
    try {
        // Player ID aus der URL
        const playerID = params.player;
        //Falls UUID leer ist
        if (!playerID) {
            return new Response(
                JSON.stringify({ error: 'Missing player id' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        // Request body auslesen
        const data = await request.json();
        // Name aus body nehmen
        const name = data.name;
        // Pruefen ob name valide ist
        if (!name || typeof name !== 'string' || name.trim().length == 0) {
            return new Response(
                JSON.stringify({
                    error: 'name is required and must be a string.'
                }), {
                    status: 400
                }
            );
        }

        // Spieler namen in DB anpassen und geaendertes Objekt zurueckgeben
        const [updatedPlayer] = await db
            .update(player)
            .set({ name: name })
            .where(eq(player.id, playerID))
            .returning();
        // Pruefen ob das Objekt null ist
        if (!updatedPlayer) {
            return new Response(
                JSON.stringify({ error: 'Player not found' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        // Umwandeln in type Player
        const returnPlayer: Player = updatedPlayer as Player; 

        // OK und Spieler zurueckgeben
        return new Response(
            JSON.stringify({
                message: 'Updated Player',
                player: returnPlayer
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json'}
            }
        );
    } catch(error) {
        // Falls die DB einen Fehler wirft
        return new Response(
            JSON.stringify({  
                error: 'Database error while updating player',
                details: error instanceof Error? error.message : String(error)
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
};

export const DELETE: RequestHandler = async({ params }) => {
    try {
        // Player ID aus der URL
        const playerID = params.player;
        //Falls UUID leer ist
        if (!playerID) {
            return new Response(
                JSON.stringify({ error: 'Missing player id' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        // Spieler loeschen und geloeschted Objekt zurueckgeben
        const [deletedPlayer] = await db
            .delete(player)
            .where(eq(player.id, playerID))
            .returning();
        
        // Pruefen ob geloeschted Objekt null ist
        if (!deletedPlayer) {
            return new Response(
                JSON.stringify({ error: 'Player not found' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        // Umwandeln in type Player
        const returnPlayer: Player = deletedPlayer as Player;

        // OK und Spieler zurueckgeben
        return new Response(
            JSON.stringify({
                message: 'Player deleted',
                player: returnPlayer
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }catch(error) {
        // Falls die DB einen Fehler wirft
        return new Response(
            JSON.stringify({  
                error: 'Database error while deleting player',
                details: error instanceof Error? error.message : String(error)
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}