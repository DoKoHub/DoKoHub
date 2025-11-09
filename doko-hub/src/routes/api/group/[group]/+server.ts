import { BadResponse, ErrorResponse, GETResponse, PUTOrDeleteResponse } from "$lib/responses";
import { db } from "$lib/server/db";
import { groupInvite, playgroup } from "$lib/server/db/schema";
import type { PlayGroup, PlayGroupMember } from "$lib/types";
import type { RequestHandler } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import { z } from "zod";



// CHANGED: Minimale Schemas für Format-/Pflichtprüfungen
const UUID = z.string().uuid();
const UpdatePlayGroupSchema = z
  .object({
    // Name muss String, getrimmt, nicht leer
    name: z.string().trim().min(1),
  })
  .passthrough(); // andere Felder (lastPlayedOn, note) unverändert durchlassen


export const GET: RequestHandler = async({ params }) => {
    try {
        // UUID der Gruppe
        const groupId = params.group;

        //Falls UUID leer ist
        if (!groupId) {
            return new BadResponse('PlayGroup ID required');
        }

        // CHANGED: zusätzliches UUID-Format-Checking (gleiche Fehlermeldung)
    if (!UUID.safeParse(groupId).success) {
      return new BadResponse("PlayGroup ID required");
    }

        // Alle möglichen Spieler aus DB sammeln
        const groupsFromDB = await db
            .select()
            .from(playgroup)
            .where(eq(playgroup.id, groupId));
        
        // Pruefen ob Gruppen zurueckgegeben wurden
        if (!groupsFromDB[0]) {
            return new BadResponse('PlayGroup not found');
        }

        // OK und Gruppe zurueckgeben
        return new GETResponse(groupsFromDB[0] as PlayGroup);
    } catch(error) {
        // Falls die DB einen Fehler wirft
        return new ErrorResponse('Database error while fetching PlayGroup');
    }
};

export const PUT: RequestHandler = async({ request, params }) => {
    try {
        // UUID der Gruppe
        const groupId = params.group;
        
        //Falls UUID leer ist
        if (!groupId) {
            return new BadResponse('PlayGroup ID required');
        }

        // CHANGED: zusätzliches UUID-Format-Checking (gleiche Fehlermeldung)
    if (!UUID.safeParse(groupId).success) {
      return new BadResponse("PlayGroup ID required");
    }


        const body = await request.json();
        const newGroup = body.playGroup;
        
        if (!newGroup) {
            return new BadResponse('Valid PlayGroup required');
        }


        // CHANGED: Validierung von name (String + nicht leer), andere Felder werden durchgelassen
    const parsed = UpdatePlayGroupSchema.safeParse(newGroup);
    if (!parsed.success) {
      // gleiche Message wie vorher bei leerem/invalidem Namen
      return new BadResponse("Name required and must be a string");
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
            return new BadResponse('PlayGroup not found');
        }

        return new PUTOrDeleteResponse('Updated PlayGroup', {name: 'playGroup', data: updatedGroup as PlayGroup})
    } catch(error) {
        // Falls die DB einen Fehler wirft
        return new ErrorResponse('Database error while updating PlayGroup');
    }
}

export const DELETE: RequestHandler = async({ params, fetch }) => {
    try {
        // UUID der Gruppe
        const groupId = params.group;

        //Falls UUID leer ist
        if (!groupId) {
            return new BadResponse('PlayGroup ID required');
        }

         // CHANGED: zusätzliches UUID-Format-Checking (gleiche Fehlermeldung)
    if (!UUID.safeParse(groupId).success) {
      return new BadResponse("PlayGroup ID required");
    }


        const groupResponse = await fetch(`/api/group/${groupId}`);
        if (groupResponse.status == 400) {
            return new BadResponse('PlayGroup not found');
        }

        const groupResponseBody = await groupResponse.json();

        if (Object.keys(groupResponseBody).length == 0) {
            return new BadResponse("PlayGroup not found");
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
        
        return new PUTOrDeleteResponse('Deleted PlayGroup', {name: 'playGroup', data: deletedGroup as PlayGroup});
    } catch(error) {
        return new ErrorResponse('Database error while deleting PlayGroup');
    }
}