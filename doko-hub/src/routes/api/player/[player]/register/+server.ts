import { db } from "$lib/server/db";
import { playerIdentity } from "$lib/server/db/schema";
import type { PlayerIdentity } from "$lib/types";
import type { RequestHandler } from "@sveltejs/kit";
import { eq } from "drizzle-orm";


export const POST: RequestHandler = async({ request, params }) => {
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
        // PlayerIdentity aus data sammeln
        const input: PlayerIdentity = data.playerIdentity as PlayerIdentity;

        // Pruefen ob playerIdentiyt null ist
        if (!input) {
            return new Response(
                JSON.stringify({
                    error: 'Valid PlayerIdentity required'
                }), {
                    status: 400
                }
            );
        }

        input.playerId = playerID;

        // Pruefen ob Spieler schon eine Identität hat
        const [output] = await db
            .select()
            .from(playerIdentity)
            .where(eq(playerIdentity.playerId, playerID));
        
        if (output) {
            return new Response(
                JSON.stringify({
                    error: 'Player already has an identity'
                }), {
                    status: 400
                }
            );
        }

        // Mapping v.1
        // id wird von db erstellt
        const insertObj = {
            playerId: playerID,
            provider: input.provider,
            subject: input.subject,
            email: input.email,
            createdAt: input.createdAt ? new Date(input.createdAt) : new Date() // falls kein Date angegeben ist
        };

        // In db speichern
        const [dbIdentity] = await db
            .insert(playerIdentity)
            .values(insertObj)
            .returning();

        // Mapping v.2
        const returningPlayerIdentity: PlayerIdentity = {
            id: dbIdentity.id,
            playerId: dbIdentity.playerId,
            provider: dbIdentity.provider,
            subject: dbIdentity.subject,
            email: dbIdentity.email,
            createdAt: dbIdentity.createdAt ? dbIdentity.createdAt.toISOString() : null
        };

        // OK und PlayerIdentity Objekt zurueckgeben 
        return new Response(
            JSON.stringify({
                message: `Linked Player "${playerID}" to given PlayerIdentity`,
                playerIdentity: returningPlayerIdentity
            }), {
                status: 201,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    } catch(error) {
        // Falls die DB einen Fehler wirft
        return new Response(
            JSON.stringify({  
                error: 'Database error while linking PlayerIdentity',
                details: error instanceof Error? error.message : String(error)
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
};