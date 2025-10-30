import { BadResponse, ErrorResponse, GETResponse, PUTOrDeleteResponse } from "$lib/responses";
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
            return new BadResponse('Missing player id');
        }

        // Alle möglichen Spieler aus DB sammeln
        const playersFromDB = await db
            .select()
            .from(player)
            .where(eq(player.id, playerID));

        if(!playersFromDB || !playersFromDB[0]) {
            return new BadResponse('Player not found');
        }

        // OK und Spieler zurueckgeben
        return new GETResponse(playersFromDB[0] as Player);
    } catch(error) {
        return new ErrorResponse(`Database error while fetching player "${params.player}"`)
    }

};

export const PUT: RequestHandler = async({ request, params}) => {
    try {
        // Player ID aus der URL
        const playerID = params.player;
        //Falls UUID leer ist
        if (!playerID) {
            return new BadResponse('Missing player id');
        }

        // Request body auslesen
        const data = await request.json();
        // Name aus body nehmen
        const name = data.name;
        // Pruefen ob name valide ist
        if (!name || typeof name !== 'string' || name.trim().length == 0) {
            return new BadResponse('name is required and must be a string.');
        }

        // Spieler namen in DB anpassen und geaendertes Objekt zurueckgeben
        const [updatedPlayer] = await db
            .update(player)
            .set({ name: name })
            .where(eq(player.id, playerID))
            .returning();
        
        // Pruefen ob das Objekt null ist
        if (!updatedPlayer) {
            return new BadResponse('Player not found');
        }

        // OK und Spieler zurueckgeben
        return new PUTOrDeleteResponse('Updated Player', {name: 'player', data: updatedPlayer as Player})
    } catch(error) {
        return new ErrorResponse('Database error while updating player')
    }
};

export const DELETE: RequestHandler = async({ params }) => {
    try {
        // Player ID aus der URL
        const playerID = params.player;
        //Falls UUID leer ist
        if (!playerID) {
            return new BadResponse('Missing player id');
        }

        // Spieler loeschen und geloeschted Objekt zurueckgeben
        const [deletedPlayer] = await db
            .delete(player)
            .where(eq(player.id, playerID))
            .returning();

        // Pruefen ob geloeschted Objekt null ist
        if (!deletedPlayer) {
            return new BadResponse('Player not found');
        }

        // OK und Spieler zurueckgeben
        return new PUTOrDeleteResponse('Player deleted', {name: 'player', data: deletedPlayer as Player})
    } catch(error) {
        // Falls die DB einen Fehler wirft
        return new ErrorResponse('Database error while deleting player');
    }
}