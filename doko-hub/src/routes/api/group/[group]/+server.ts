import { BadResponse, ErrorResponse, GETResponse, PUTOrDeleteResponse } from "$lib/responses";
import { db } from "$lib/server/db";
import { playgroup } from "$lib/server/db/schema";
import type { PlayGroup } from "$lib/types";
import type { RequestHandler } from "@sveltejs/kit";
import { eq } from "drizzle-orm";


export const GET: RequestHandler = async({ params }) => {
    try {
        // UUID der Gruppe
        const groupId = params.group;

        //Falls UUID leer ist
        if (!groupId) {
            return BadResponse('Missing group id');
        }

        // Alle möglichen Spieler aus DB sammeln
        const groupsFromDB = await db
            .select()
            .from(playgroup)
            .where(eq(playgroup.id, groupId));
        
        // Pruefen ob Gruppen zurueckgegeben wurden
        if (!groupsFromDB) {
            return BadResponse('Group not found');
        }

        // OK und Gruppe zurueckgeben
        return GETResponse(groupsFromDB[0] as PlayGroup);
    } catch(error) {
        // Falls die DB einen Fehler wirft
        return ErrorResponse( `Database error while fetching group "${params.group}"`, error);
    }
};

export const PUT: RequestHandler = async({ request, params }) => {
    try {
        // UUID der Gruppe
        const groupId = params.group;
        
        //Falls UUID leer ist
        if (!groupId) {
            return BadResponse('Missing group id');
        }

        const body = await request.json();
        const newGroup = body.playGroup;
        
        if (!newGroup) {
            return BadResponse('Must send a valid PlayGroup');
        }

        const [updatedGroup] = await db
            .update(playgroup)
            .set(newGroup)
            .where(eq(playgroup.id, groupId))
            .returning();

        return PUTOrDeleteResponse('Updated Group', {name: 'playGroup', data: updatedGroup as PlayGroup})
    } catch(error) {
        // Falls die DB einen Fehler wirft
        return ErrorResponse(`Database error while updating group "${params.group}"`, error);
    }
}

export const DELETE: RequestHandler = async({ params }) => {
    try {
        // UUID der Gruppe
        const groupId = params.group;

        //Falls UUID leer ist
        if (!groupId) {
            return BadResponse('Missing group id');
        }

        const [deletedGroup] = await db
            .delete(playgroup)
            .where(eq(playgroup.id, groupId))
            .returning();
        
        return PUTOrDeleteResponse('Deleted Group', {name: 'playGroup', data: deletedGroup as PlayGroup});
    } catch(error) {
        return ErrorResponse('Database error while deletig group', error);
    }
}