import { badRequest, ok, serverError } from "$lib/http";
import { db } from "$lib/server/db";
import { sessionMember } from "$lib/server/db/schema";
import { SessionMember, UUID } from "$lib/types";
import { readValidatedBody } from "$lib/validation";
import type { RequestHandler } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import z from "zod";


export const GET: RequestHandler = async({ params }) => {
    try {
        const groupId = params.group;
        const sessionId = params.session;

        if (!groupId || !(UUID.safeParse(groupId)).success) {
            return badRequest({ message: 'PlayGroup ID required' });
        }

        if (!sessionId || !(UUID.safeParse(sessionId)).success) {
            return badRequest({ message: 'Session ID required' });
        }

        const groupResponse = await fetch(`/api/group/${groupId}`);
        if (groupResponse.status != 200) {
            return badRequest({ message: 'PlayGroup not found' });
        }

        const sessionResponse = await fetch(`/api/group/${groupId}/session/${sessionId}`);
        if (sessionResponse.status != 200) {
            return badRequest({ message: 'Session not found' });
        }

        const sessionMembersFromDB = await db
            .select()
            .from(sessionMember)
            .where(eq(sessionMember.sessionId, sessionId));

        return ok(sessionMembersFromDB as SessionMember[]);
    } catch(error) {
        return serverError({ message: 'Database error while fetching SessionMember[]' });
    }
};

export const POST: RequestHandler = async(event) => {
    const bodySchema = z.object({
        playerId: UUID
    });
    const {playerId} = await readValidatedBody(event, bodySchema);

    try {
        const groupId = event.params.group;
        const sessionId = event.params.session;

        if (!groupId || !(UUID.safeParse(groupId)).success) {
            return badRequest({ message: 'PlayGroup ID required' });
        }

        if (!sessionId || !(UUID.safeParse(sessionId)).success) {
            return badRequest({ message: 'Session ID required' });
        }

        const groupResponse = await event.fetch(`/api/group/${groupId}`);
        if (groupResponse.status != 200) {
            return badRequest({ message: 'PlayGroup not found' });
        }

        const sessionResponse = await event.fetch(`/api/group/${groupId}/session/${sessionId}`);
        if (sessionResponse.status != 200) {
            return badRequest({ message: 'Session not found' });
        }

        const [createdPlayer] = await db
            .insert(sessionMember)
            .values({
                sessionId: sessionId,
                playerId: playerId
            })
            .returning();
        
        return ok({ message: 'Created SessionMember', sessionMember: createdPlayer as SessionMember });
    } catch(error) {
        return serverError({ message: 'Database error while creating SessionMember' });
    }
}