import { badRequest, created, ok, serverError } from "$lib/http";
import { db } from "$lib/server/db";
import { playgroup } from "$lib/server/db/schema";
import { Name, PlayGroup, PlayGroupMember, UUID } from "$lib/types";
import { readValidatedBody } from "$lib/validation";
import type { RequestHandler } from "@sveltejs/kit";
import z from "zod";

export const GET: RequestHandler = async({ fetch }) => {
    try {

        // Alle Gruppen aus der DB lesen
        const groupsFromDB = await db
            .select()
            .from(playgroup);
        
        let playGroups: PlayGroup[] = [];
        for (let i =0; i < groupsFromDB.length; i++) {
            const group = groupsFromDB[i];
            if (!group) {
                continue;
            }
            const response = await fetch(`api/group/${group.id}/member`);
            const body = await response.json();

            playGroups.push({
                id: group.id as UUID,
                name: group.name,
                createdOn: group.createdOn ? new Date(group.createdOn) : null,
                lastPlayedOn: group.lastPlayedOn ? new Date(group.lastPlayedOn) : null,
                members: body as PlayGroupMember[]
            })
        }

        return ok(groupsFromDB as PlayGroup[])
    } catch(error) {
        // Falls die DB einen Fehler wirft
        return serverError({ message: 'Database error while fetching PlayGroup[]' });
    }
}

export const POST: RequestHandler = async(event) => {
    const bodySchema = z.object({
        name: Name
    });
    const { name } = await readValidatedBody(event, bodySchema)

    try {
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