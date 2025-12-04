import { badRequest, ok, serverError } from "$lib/http";
import { db } from "$lib/server/db";
import { groupInvite, playgroup } from "$lib/server/db/schema";
import { PlayGroup, UUID, type PlayGroupMember } from "$lib/types";
import type { RequestHandler } from "@sveltejs/kit";
import { eq } from "drizzle-orm";

export const GET: RequestHandler = async({ params, fetch }) => {
    try {
        // UUID der Gruppe
        const groupId = params.group;

        //Falls UUID leer ist
        if (!groupId || !(UUID.safeParse(groupId).success)) {
            return badRequest({ message: 'PlayGroup ID required' });
        }

        // Alle möglichen Spieler aus DB sammeln
        const groupsFromDB = await db
            .select()
            .from(playgroup)
            .where(eq(playgroup.id, groupId));
        
        // Pruefen ob Gruppen zurueckgegeben wurden
        if (!groupsFromDB[0]) {
            return badRequest({ message: 'PlayGroup not found' });
        }

        const response = await fetch(`/api/group/${groupsFromDB[0].id}/member`);
        const body = await response.json();

        const finalGroup: PlayGroup = {
            id: groupsFromDB[0].id as UUID,
            name: groupsFromDB[0].name,
            createdOn: groupsFromDB[0].createdOn ? new Date(groupsFromDB[0].createdOn) : null,
            lastPlayedOn: groupsFromDB[0].lastPlayedOn ? new Date(groupsFromDB[0].lastPlayedOn) : null,
            members: body as PlayGroupMember[]
        };

        // OK und Gruppe zurueckgeben
        return ok(finalGroup);
    } catch(error) {
        // Falls die DB einen Fehler wirft
        return serverError({ message: 'Database error while fetching PlayGroup' });
    }
};

export const PUT: RequestHandler = async({ request, params }) => {
    try {
        // UUID der Gruppe
        const groupId = params.group;
        
        //Falls UUID leer ist
        if (!groupId || !(UUID.safeParse(groupId).success)) {
            return badRequest({ message: 'PlayGroup ID required' });
        }

        const body = await request.json();
        const newGroup = body.playGroup;
        
        if (!newGroup || !(PlayGroup.safeParse(newGroup).success)) {
            return badRequest({ message: 'Valid PlayGroup required' });
        }

        const [updatedGroup] = await db
            .update(playgroup)
            .set({
                name: newGroup.name,
                lastPlayedOn: newGroup.lastPlayedOn?.toISOString(),
            })
            .where(eq(playgroup.id, groupId))
            .returning();

        if (!updatedGroup) {
            return badRequest({ message: 'PlayGroup not found' });
        }

        return ok({ message: 'Updated PlayGroup', playGroup: updatedGroup as PlayGroup });
    } catch(error) {
        // Falls die DB einen Fehler wirft
        console.log(error);
        return serverError({ message: 'Database error while updating PlayGroup' });
    }
}

export const DELETE: RequestHandler = async({ params, fetch }) => {
    try {
        // UUID der Gruppe
        const groupId = params.group;

        //Falls UUID leer ist
        if (!groupId || !(UUID.safeParse(groupId).success)) {
            return badRequest({ message: 'PlayGroup ID required' });
        }

        const groupResponse = await fetch(`/api/group/${groupId}`);
        if (groupResponse.status != 200) {
            return badRequest({ message: 'PlayGroup not found' });
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
        
        return ok({ message: 'Deleted PlayGroup', playGroup: deletedGroup as PlayGroup });
    } catch(error) {
        return serverError({ message: 'Database error while deleting PlayGroup' })
    }
}