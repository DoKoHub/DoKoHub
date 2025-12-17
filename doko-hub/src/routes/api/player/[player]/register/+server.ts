import { BadResponse, ErrorResponse, POSTResponse } from "$lib/responses";
import { db } from "$lib/server/db";
import { playerIdentity } from "$lib/server/db/schema";
import type { PlayerIdentity } from "$lib/types";
import { validateEmail } from "$lib/utils";
import type { RequestHandler } from "@sveltejs/kit";
import { eq } from "drizzle-orm";


export const POST: RequestHandler = async({ request, params, fetch }) => {
    try {
        // Player ID aus der URL
        const playerID = params.player;
        //Falls UUID leer ist
        if (!playerID) {
            return new BadResponse('Missing player id');
        }

        const identityResponse = await fetch(`api/player/${playerID}/identity`);
        if (identityResponse.status == 200) {
            return new BadResponse('Player already has an identity');
        }

        // Request body auslesen
        const data = await request.json();
        // PlayerIdentity aus data sammeln
        const input: PlayerIdentity = data.playerIdentity as PlayerIdentity;

        // Pruefen ob playerIdentiyt null ist
        if (!input) {
            return new BadResponse('Valid PlayerIdentity required');
        }

        if (!input.subject || input.subject.trim().length === 0) {
            return new BadResponse('Subject is required');
        }

        if (!input.provider || input.provider.trim().length === 0) {
            return new BadResponse('Provider is required');
        }

        if (!input.email || !validateEmail(input.email)) {
            return new BadResponse('Valid formatted email is required');
        }

        input.playerId = playerID;

        // Pruefen ob Spieler schon eine Identität hat
        const [output] = await db
            .select()
            .from(playerIdentity)
            .where(eq(playerIdentity.playerId, playerID));
        
        if (output) {
            return new BadResponse('Player already has an identity');
        }

        // Mapping v.1
        // id wird von db erstellt
        const insertObj = {
            playerId: playerID,
            provider: input.provider,
            subject: input.subject,
            email: input.email,
            createdAt: input.createdAt ? input.createdAt : new Date() // falls kein Date angegeben ist
        };

        // In db speichern
        const [dbIdentity] = await db
            .insert(playerIdentity)
            .values(insertObj)
            .returning();

        // OK und PlayerIdentity Objekt zurueckgeben
        return new POSTResponse(`Linked Player "${playerID}" to given PlayerIdentity`, {name: 'playerIdentity', data: dbIdentity as PlayerIdentity})
    } catch(error) {
        // Falls die DB einen Fehler wirft
        return new ErrorResponse('Database error while linking PlayerIdentity')
    }
};