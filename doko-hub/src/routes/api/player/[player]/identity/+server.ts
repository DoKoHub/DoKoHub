import { badRequest, ok, serverError } from "$lib/http";
import { db } from "$lib/server/db";
import { playerIdentity } from "$lib/server/db/schema";
import { PlayerIdentity, UUID } from "$lib/types";
import { validateEmail } from "$lib/utils";
import type { RequestHandler } from "@sveltejs/kit";
import { eq } from "drizzle-orm";

export const GET: RequestHandler = async({ params }) => {
    try {
        // Player ID aus der URL
        const playerID = params.player;
        //Falls UUID leer ist
        if (!playerID || !(UUID.safeParse(playerID).success)) {
            return badRequest({ message: 'Player ID required' });
        }

        // PlayerIdentity aus der DB holen
        const [dbPlayerIdentity] = await db
            .select()
            .from(playerIdentity)
            .where(eq(playerIdentity.playerId, playerID));

        // Pruefen ob die identitset null ist
        if (!dbPlayerIdentity) {
            return badRequest({ message: 'PlayerIdentity not found' });
        }

        // OK und PlayerIdentity zurueckgeben
        return ok(dbPlayerIdentity as PlayerIdentity);
    } catch(error) {
        // Falls die DB einen Fehler wirft
        return serverError({message: 'Database error while fetching PlayerIdentity'})
    }
}

export const PUT: RequestHandler = async({ request, params }) => {
    try {
        // Player ID aus der URL
        const playerID = params.player;
        //Falls UUID leer ist
        if (!playerID || !(UUID.safeParse(playerID).success)) {
            return badRequest({ message: 'Player ID required' });
        }

        // Request body
        const body = await request.json();

        if (!body.playerIdentity || !(PlayerIdentity.safeParse(body.playerIdentity).success)) {
            return badRequest({ message: 'PlayerIdentity required' });
        }

        if (!validateEmail(body.playerIdentity.email)) {
            return badRequest({ message: 'Valid Email required' });
        }

        // PlayerIdentity updaten und als Objekt zurueckgeben   
        const [updatedPlayerIdentity] = await db
            .update(playerIdentity)
            .set({ email: body.playerIdentity.email })
            .where(eq(playerIdentity.playerId, playerID))
            .returning();

        // Pruefen ob Identität null ist
        if (!updatedPlayerIdentity) {
            return badRequest({ message: 'PlayerIdentity not found' });
        }

        // OK und aktualisierte PlayerIdentity zurueckgeben
        return ok({ message: 'Updated PlayerIdentity', playerIdentity: updatedPlayerIdentity as PlayerIdentity });
    } catch(error) {
        // Falls die DB einen Fehler wirft
        return serverError({ message: 'Database error while updating PlayerIdentity' });
    }
}

export const DELETE: RequestHandler = async({ params }) => {
    try {
        // Player ID aus der URL
        const playerID = params.player;
        //Falls UUID leer ist
        if (!playerID || !(UUID.safeParse(playerID).success)) {
            return badRequest('Player ID required');
        }

        // PlayerIdentity aus der DB loeschen und als Objekt speichern
        const [dbPlayerIdentity] = await db
            .delete(playerIdentity)
            .where(eq(playerIdentity.playerId, playerID))
            .returning();

        // Pruefen ob geloeschtes Objekt null ist
        if (!dbPlayerIdentity) {
            return badRequest({ message: 'PlayerIdentity not found' });
        }

        // OK und geloeschte Identitaet zurueckgeben
        return ok({ message: 'Deleted PlayerIdentity', playerIdentity: dbPlayerIdentity as PlayerIdentity });
    } catch(error) {
        // Falls die DB einen Fehler wirft
        return serverError({ message: 'Database error while deleting PlayerIdentity' });
    }
}