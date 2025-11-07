import { BadResponse, ErrorResponse, GETResponse, POSTResponse } from "$lib/responses";
import { db } from "$lib/server/db";
import { playgroup } from "$lib/server/db/schema";
import type { PlayGroup } from "$lib/types";
import type { RequestHandler } from "@sveltejs/kit";

import { z } from "zod";


// CHANGED: Minimales Body-Schema (validiert nur: String, getrimmt, nicht leer)
// Wichtig: Wir benutzen das Schema NUR zur Prüfung; gespeichert wird der Original-Name .
const CreateBodySchema = z.object({
  name: z.string().trim().min(1) // kein max-Limit, damit Verhalten exakt wie vorher bleibt
});


export const GET: RequestHandler = async() => {
    try {

        // Alle Gruppen aus der DB lesen
        const groupsFromDB = await db
            .select()
            .from(playgroup);
        
        // mapping
        const groups: PlayGroup[] = groupsFromDB as PlayGroup[];

        // OK und Gruppen zurueckgeben
        return new GETResponse(groups);
    } catch(error) {
        // Falls die DB einen Fehler wirft
        return new ErrorResponse('Database error while fetching PlayGroup[]')
    }
}

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

        // CHANGED: Zusätzliches Format-Checking via Zod (gleiche Fehlermeldung bei Fehler)
    const parsed = CreateBodySchema.safeParse({ name });
    if (!parsed.success) {
      return new BadResponse("Name required and must be a string");
    }

        const creationObj = {
            name: name,
            createdOn: new Date().toISOString().slice(0, 10) // 'YYYY-MM-DD'
        };

        const [insertedGroup] = await db
            .insert(playgroup)
            .values(creationObj)
            .returning()
        
        return new POSTResponse('Created PlayGroup', {name: 'playGroup', data: insertedGroup as PlayGroup})
    } catch(error) {
        // Falls die DB einen Fehler wirft
        return new ErrorResponse('Database error while creating PlayGroup');
    }
}