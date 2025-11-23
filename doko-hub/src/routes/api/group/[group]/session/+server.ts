import { badRequest, created, ok, serverError } from "$lib/http";
import type { RequestHandler } from "@sveltejs/kit";
import { UUID as UUIDSchema, Session, Ruleset, ISODate, UUID, SessionMember } from "$lib/types";
import { db } from "$lib/server/db";
import { session } from "$lib/server/db/schema";
import { eq } from "drizzle-orm";
import z from "zod";
import { readValidatedBody } from "$lib/validation";

export const GET: RequestHandler = async({ params, fetch }) => { 
    try {
        const groupId = params.group;
        if (!groupId) {
            return badRequest({ message: 'PlayGroup ID required' });
        }

        const parsed = UUIDSchema.safeParse(groupId);
        if (!parsed.success) {
            return badRequest({ message: 'PlayGroup ID required' });
        } 

        const groupResponse = await fetch(`/api/group/${groupId}`);
        if (groupResponse.status != 200) {
            return badRequest({ message: 'PlayGroup not found' });
        }

        const sessionsFromDB = await db
            .select()
            .from(session)
            .where(eq(session.groupId, groupId));

        const sessions: Session[] = [];
        for (let i = 0; i < sessionsFromDB.length; i++) {
            const session = sessionsFromDB[i];
            
            const response = await fetch(`api/group/${groupId}/session/${session.id}/sessionmember`)
            const body = await response.json();

            sessions.push({
                id: session.id as UUID,
                groupId: session.groupId as UUID,
                ruleset: session.ruleset,
                plannedRounds: session.plannedRounds,
                startedAt: session.startedAt,
                endedAt: session.endedAt,
                members: body as SessionMember[]
            });
        }

        
        return ok(sessions);
    } catch(error) {
        return serverError({ message: 'Database error while fetching Session[]' })
    }
};

export const POST: RequestHandler = async(event) => {
    const bodySchema = z.object({
        ruleSet: Ruleset,
        plannedRounds: z.number().int().min(1),
        startedAt: ISODate.optional().nullable(),
    });
    const { ruleSet, plannedRounds, startedAt } = await readValidatedBody(event, bodySchema);

    try {
        const groupId = event.params.group;
        if (!groupId) {
            return badRequest({ message: 'PlayGroup ID required' });
        }

        const parsed = UUIDSchema.safeParse(groupId);
        if (!parsed.success) {
            return badRequest({ message: 'PlayGroup ID required' });
        } 

        const groupResponse = await event.fetch(`/api/group/${groupId}`);
        if (groupResponse.status != 200) {
            return badRequest({ message: 'PlayGroup not found' });
        }

        const [createdSession] = await db
            .insert(session)
            .values({
                groupId: groupId,
                ruleset: ruleSet,
                plannedRounds: plannedRounds,
                startedAt: startedAt
            })
            .returning();
        
        if (!createdSession) {
            return badRequest({ message: 'Session could not be created' });
        }

        return created({ message: 'Created Session', session: createdSession as Session });
    } catch(error) {
        return serverError({ message: 'Database error while creating Session' });
    } 
};