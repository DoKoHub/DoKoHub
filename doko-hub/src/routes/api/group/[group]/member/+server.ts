import { badRequest, created, ok, serverError } from "$lib/http";
import { db } from "$lib/server/db";
import { playgroupMember } from "$lib/server/db/schema";
import { Name, UUID, type PlayerStatus, type PlayGroupMember } from "$lib/types";
import { readValidatedBody } from "$lib/validation";
import type { RequestHandler } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import z from "zod";

export const GET: RequestHandler = async({ params }) => {
    try {
        // UUID der Gruppe
        const groupId = params.group;

        if (!groupId || !(UUID.safeParse(groupId).success)) {
            return badRequest({ message: 'PlayGroup ID required' })
        }

        const members = await db
            .select()
            .from(playgroupMember)
            .where(eq(playgroupMember.groupId, groupId));

        return ok(members as PlayGroupMember[])
    } catch(error) {
        return serverError({ message: 'Database error while fetching PlayGroupMember[]' })
    }
}

export const POST: RequestHandler = async(event) => {
    const bodySchema = z.object({
      playerId: UUID,
      nickname: Name.optional(), // optional, wird bei Invalid fallbacken
    });
    const { playerId, nickname } = await readValidatedBody(event, bodySchema);

    try {
        // UUID der Gruppe
        const groupId = event.params.group;

        if (!groupId || !(UUID.safeParse(groupId).success)) {
            return badRequest({ message: 'PlayGroup ID required' })
        }

       

      // CHANGED: Vor Beitritt prüfen, ob bereits 4 aktive Mitglieder in der Gruppe sind

        const existingMembers = await db
            .select()
            .from(playgroupMember)
            .where(eq(playgroupMember.groupId, groupId)); // CHANGED: Mitglieder der Gruppe laden


        const activeCount = existingMembers.filter(m => m.status === 'ACTIVE').length; // CHANGED: nur ACTIVE-Mitglieder zählen

        if (activeCount >= 4) {
            return badRequest({
                message: 'This PlayGroup is already full (max. 4 active members).', // CHANGED: Beitritt blocken, wenn Gruppe voll ist
            });
        }
        


        const groupResponse = await event.fetch(`/api/group/${groupId}`);
        if (groupResponse.status != 200) {
            return badRequest({ message: 'PlayGroup not found' })
        }
    

        const playerResponse = await event.fetch(`/api/player/${playerId}`);
        if (playerResponse.status != 200) {
            return badRequest({ message: 'Player not found' });
        }
        const player = (await playerResponse.json()).player; 

        const playgroupMemberObj = {
            groupId: groupId,
            playerId: player.id,
            nickname: nickname ? nickname : player.name,
            status: "ACTIVE" as PlayerStatus
        }

        const [playgroupMemberFromDB] = await db
            .insert(playgroupMember)
            .values(playgroupMemberObj)
            .returning();

        return created({ message: 'Created PlayGroupMember', playGroupMember: playgroupMemberFromDB as PlayGroupMember });
    } catch(error) {
        return serverError({ message: 'Database error while creating PlayGroupMember' });
    }
};