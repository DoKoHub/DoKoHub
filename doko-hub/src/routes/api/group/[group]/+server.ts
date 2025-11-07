import { BadResponse, ErrorResponse, GETResponse, PUTOrDeleteResponse } from "$lib/responses";
import { db } from "$lib/server/db";
import { groupInvite, playgroup } from "$lib/server/db/schema";
import type { PlayGroup, PlayGroupMember } from "$lib/types";
import type { RequestHandler } from "@sveltejs/kit";
import { eq } from "drizzle-orm";


export const GET: RequestHandler = async({ params }) => {
    try {
        // UUID der Gruppe
        const groupId = params.group;

        //Falls UUID leer ist
        if (!groupId) {
            return new BadResponse('Missing group id');
        }

        // Alle möglichen Spieler aus DB sammeln
        const groupsFromDB = await db
            .select()
            .from(playgroup)
            .where(eq(playgroup.id, groupId));
        
        // Pruefen ob Gruppen zurueckgegeben wurden
        if (!groupsFromDB[0]) {
            return new BadResponse('Group not found');
        }

        // OK und Gruppe zurueckgeben
        return new GETResponse(groupsFromDB[0] as PlayGroup);
    } catch(error) {
        // Falls die DB einen Fehler wirft
        return new ErrorResponse( `Database error while fetching group "${params.group}"`);
    }
};

export const PUT: RequestHandler = async({ request, params }) => {
    try {
        // UUID der Gruppe
        const groupId = params.group;
        
        //Falls UUID leer ist
        if (!groupId) {
            return new BadResponse('Missing group id');
        }

        const body = await request.json();
        const newGroup = body.playGroup;
        
        if (!newGroup) {
            return new BadResponse('Must send a valid PlayGroup');
        }

        if (newGroup.name.trim().length === 0) {
            return new BadResponse('Name is required and must be a string');
        }

        const [updatedGroup] = await db
            .update(playgroup)
            .set({
                name: newGroup.name,
                lastPlayedOn: newGroup.lastPlayedOn,
                note: newGroup.note
            })
            .where(eq(playgroup.id, groupId))
            .returning();

        if (!updatedGroup) {
            return new BadResponse('Group not found');
        }

        return new PUTOrDeleteResponse('Updated Group', {name: 'playGroup', data: updatedGroup as PlayGroup})
    } catch(error) {
        // Falls die DB einen Fehler wirft
        return new ErrorResponse(`Database error while updating group "${params.group}"`);
    }
}

export const DELETE: RequestHandler = async({ params, fetch }) => {
    try {
        // UUID der Gruppe
        const groupId = params.group;

        //Falls UUID leer ist
        if (!groupId) {
            return new BadResponse('Missing group id');
        }

        const groupResponse = await fetch(`/api/group/${groupId}`);
        if (groupResponse.status == 400) {
            return new BadResponse('Group not found');
        }

        const groupResponseBody = await groupResponse.json();

        if (Object.keys(groupResponseBody).length == 0) {
            return new BadResponse("Group not found");
        }


        // Abhängigkeiten löschen
        const memberResponse = await fetch(`/api/group/${groupId}/member`);
        if (memberResponse.ok) {
            const memberList: PlayGroupMember[] = await memberResponse.json();

            // Member loeschen
            for (const member of memberList) {
                await fetch(`/api/group/${groupId}/member/${member.playerId}`, {
                    method: "DELETE"
                });
            }
        }

        // Invites loeschen
        await db
            .delete(groupInvite)
            .where(eq(groupInvite.groupId, groupId));

        // TODO: Sessions loeschen

        const [deletedGroup] = await db
            .delete(playgroup)
            .where(eq(playgroup.id, groupId))
            .returning();
        
        return new PUTOrDeleteResponse('Deleted Group', {name: 'playGroup', data: deletedGroup as PlayGroup});
    } catch(error) {
        return new ErrorResponse('Database error while deleting group');
    }
}