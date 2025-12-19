import { db } from "$lib/server/db";
import { player } from "$lib/server/db/schema";
import { Player } from "$lib/types";
import type { RequestHandler } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import { UUID } from "$lib/types";
import { badRequest, ok, serverError } from "$lib/http";

/**
 * 1. GET /api/player/[player]
 * Request: Keine
 * Response 200: Player
 * Response 400: { "message": string}
 * Response 500: { "message": string}
 */

/**
 * 2. PUT /api/player/[player]
 * Request Body: { player: Player }
 * Response 200: { "message": string, player: Player }
 * Response 400: { "message": string }
 * Response 500: { "message": string }
 */

/**
 * 3. DELETE /api/player/[player]
 * Request: Keine
 * Response 200: { "message": string, player: Player }
 * Response 400: { "message": string }
 * Response 500: { "message": string }
 */

/**
 * Einzelnen Spieler anhand der UUID zurueckgeben
 * 
 * @param params URL Parameter
 * @returns Response
 */
export const GET: RequestHandler = async({ params }) => {

    try {
        const playerId = params.player;

        if (!playerId || !(UUID.safeParse(playerId).success)) {
            return badRequest({ message: 'Player ID required' });
        }

        // Alle möglichen Spieler aus DB sammeln
        const playersFromDB = await db
            .select()
            .from(player)
            .where(eq(player.id, playerId));

        if(!playersFromDB || !playersFromDB[0]) {
            return badRequest({ message: 'Player not found' })
        }

        // OK und Spieler zurueckgeben
        return ok(playersFromDB[0] as Player)
    } catch(error) {
        return serverError({ message: 'Database error while fetching Player' });
    }

};

/**
 * Aktualisiert die Daten eines bestehenden Spielers
 * 
 * @param params URL Parameter
 * @param request Das Objekt für den Zugriff auf den Body
 * @returns Response
 */
export const PUT: RequestHandler = async({ request, params}) => {
    try {
        // Player ID aus der URL
        const playerID = params.player;
        //Falls UUID leer ist
        if (!playerID || !(UUID.safeParse(playerID).success)) {
            return badRequest({ message: 'Player ID required' });
        }

        // Request body auslesen
        const body = await request.json();
        // Name aus body nehmen
        const newPlayer = body.player;
        // Pruefen ob name valide ist
        if (!newPlayer || !(Player.safeParse(newPlayer).success)) {
            return badRequest({ message: 'Valid Player required' });
        }

        // Spieler namen in DB anpassen und geaendertes Objekt zurueckgeben
        const [updatedPlayer] = await db
            .update(player)
            .set({
                name: newPlayer.name,
                email: newPlayer.email
            })
            .where(eq(player.id, playerID))
            .returning();
        
        // Pruefen ob das Objekt null ist
        if (!updatedPlayer) {
            return badRequest({ message: "Player not found" });
        }

        // OK und Spieler zurueckgeben
        return ok({ message: 'Updated Player', player: updatedPlayer as Player });
    } catch(error) {
        return serverError({ message: 'Database error while updating player' })
    }
};

/**
 * Löscht die Daten eines bestehenden Spielers
 * 
 * @param params URL Parameter
 * @returns Response
 */
export const DELETE: RequestHandler = async({ params }) => {
    try {
        // Player ID aus der URL
        const playerID = params.player;
        //Falls UUID leer ist
         if (!playerID || !(UUID.safeParse(playerID).success)) {
            return badRequest({ message: 'Player ID required' });
        }

        // Spieler loeschen und geloeschted Objekt zurueckgeben
        const [deletedPlayer] = await db
            .delete(player)
            .where(eq(player.id, playerID))
            .returning();

        // Pruefen ob geloeschted Objekt null ist
        if (!deletedPlayer) {
            return badRequest({ message: 'Player not found' });
        }

        // OK und Spieler zurueckgeben
        return ok({ message: 'Deleted Player', player: deletedPlayer as Player });
    } catch(error) {
        // Falls die DB einen Fehler wirft
        return serverError({ message: 'Database error while deleting Player' })
    }
}