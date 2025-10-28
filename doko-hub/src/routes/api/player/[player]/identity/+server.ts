import { BadResponse, ErrorResponse, GETResponse, PUTOrDeleteResponse } from "$lib/responses";
import { db } from "$lib/server/db";
import { playerIdentity } from "$lib/server/db/schema";
import type { PlayerIdentity } from "$lib/types";
import type { RequestHandler } from "@sveltejs/kit";
import { eq } from "drizzle-orm";


export const GET: RequestHandler = async({ params }) => {
    try {
        // Player ID aus der URL
        const playerID = params.player;
        //Falls UUID leer ist
        if (!playerID) {
            return new BadResponse('Missing player id');
        }

        // PlayerIdentity aus der DB holen
        const [dbPlayerIdentity] = await db
            .select()
            .from(playerIdentity)
            .where(eq(playerIdentity.playerId, playerID));

        // Pruefen ob die identitset null ist
        if (!dbPlayerIdentity) {
            return new BadResponse('PlayerIdentity not found');
        }

        // Mapping
        const returningPlayerIdentity: PlayerIdentity = {
            id: dbPlayerIdentity.id,
            playerId: dbPlayerIdentity.playerId,
            provider: dbPlayerIdentity.provider,
            subject: dbPlayerIdentity.subject,
            email: dbPlayerIdentity.email,
            createdAt: dbPlayerIdentity.createdAt.toISOString()
        };

        // OK und PlayerIdentity zurueckgeben
        return new GETResponse(returningPlayerIdentity);
    } catch(error) {
        // Falls die DB einen Fehler wirft
        return new ErrorResponse('Database error while getting PlayerIdentity');
    }
}

export const PUT: RequestHandler = async({ request, params }) => {
    try {
        // Player ID aus der URL
        const playerID = params.player;
        //Falls UUID leer ist
        if (!playerID) {
            return new BadResponse('Missing player id');
        }

        // Request body
        const body = await request.json();

        if (!body.playerIdentity) {
            return new BadResponse('Valid PlayerIdentity required');
        }

        //Mapping
        const newPlayerIdentity: PlayerIdentity = body.playerIdentity as PlayerIdentity;
        
        // PlayerIdentity updaten und als Objekt zurueckgeben   
        const [updatedPlayerIdentity] = await db
            .update(playerIdentity)
            .set({ email: newPlayerIdentity.email })
            .where(eq(playerIdentity.playerId, playerID))
            .returning();

        // Pruefen ob Identität null ist
        if (!updatedPlayerIdentity) {
            return new BadResponse('PlayerIdentity not found');
        }

        // Mapping
        const returningPlayerIdentity: PlayerIdentity = {
            id: updatedPlayerIdentity.id,
            playerId: updatedPlayerIdentity.playerId,
            provider: updatedPlayerIdentity.provider,
            subject: updatedPlayerIdentity.subject,
            email: updatedPlayerIdentity.email,
            createdAt: updatedPlayerIdentity.createdAt.toISOString()
        };

        // OK und aktualisierte PlayerIdentity zurueckgeben
        return new PUTOrDeleteResponse(`Updated PlayerIdentity for playerId: "${returningPlayerIdentity.playerId}"`, {name: 'playerIdentity', data: returningPlayerIdentity});
    } catch(error) {
        // Falls die DB einen Fehler wirft
        return new ErrorResponse('Database error while updating PlayerIdentity');
    }
}

export const DELETE: RequestHandler = async({ params }) => {
    try {
        // Player ID aus der URL
        const playerID = params.player;
        //Falls UUID leer ist
        if (!playerID) {
            return new BadResponse('Missing player id');
        }

        // PlayerIdentity aus der DB loeschen und als Objekt speichern
        const [dbPlayerIdentity] = await db
            .delete(playerIdentity)
            .where(eq(playerIdentity.playerId, playerID))
            .returning();

        // Pruefen ob geloeschtes Objekt null ist
        if (!dbPlayerIdentity) {
            return new BadResponse('PlayerIdentity not found');
        }

        // Mapping
        const returningPlayerIdentity: PlayerIdentity = {
            id: dbPlayerIdentity.id,
            playerId: dbPlayerIdentity.playerId,
            provider: dbPlayerIdentity.provider,
            subject: dbPlayerIdentity.subject,
            email: dbPlayerIdentity.email,
            createdAt: dbPlayerIdentity.createdAt.toISOString()
        };

        // OK und geloeschte Identitaet zurueckgeben
        return new PUTOrDeleteResponse('Deleted PlayerIdentity', {name: 'playerIdentity', data: returningPlayerIdentity});
    } catch(error) {
        // Falls die DB einen Fehler wirft
        return new ErrorResponse('Database error while deleting PlayerIdentity');
    }
}