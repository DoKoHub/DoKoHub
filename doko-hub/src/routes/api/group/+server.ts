import { badRequest, created, ok, serverError } from "$lib/http";
import { db } from "$lib/server/db";
import { playgroup } from "$lib/server/db/schema";
import { Name, type PlayGroup } from "$lib/types";
import type { RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async() => {
    try {

        // Alle Gruppen aus der DB lesen
        const groupsFromDB = await db
            .select()
            .from(playgroup);
        
        return ok(groupsFromDB as PlayGroup[])
    } catch(error) {
        // Falls die DB einen Fehler wirft
        return serverError({ message: 'Database error while fetching PlayGroup[]' });
    }
}

export const POST: RequestHandler = async({ request }) => {
    try {
        // Request body
        const body = await request.json();

        // Name ueberpruefen
        const name = body.name;
        if (!name || !(Name.safeParse(name).success)) {
            // Name ist nicht valide
            return badRequest({ message: 'Name required and must be a string' });
        }

        const creationObj = {
            name: name,
            createdOn: new Date().toISOString().slice(0, 10) // 'YYYY-MM-DD'
        };

        const [insertedGroup] = await db
            .insert(playgroup)
            .values(creationObj)
            .returning()
        
        return created({ message: 'Created PlayGroup', playGroup: insertedGroup as PlayGroup });
    } catch(error) {
        // Falls die DB einen Fehler wirft
        return serverError({ message: 'Database error while creating PlayGroup' })
    }
}