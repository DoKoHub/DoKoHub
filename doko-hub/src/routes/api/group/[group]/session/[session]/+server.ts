import { badRequest, serverError, ok } from "$lib/http";
import type { RequestHandler } from "@sveltejs/kit";
import { Ruleset, Session, SessionMember, UUID } from "$lib/types";
import { db } from "$lib/server/db";
import { session } from "$lib/server/db/schema";
import { and, eq } from "drizzle-orm";

export const GET: RequestHandler = async({ params, fetch }) => {
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

        const [returnSession] = await db
            .select()
            .from(session)
            .where(and(
                eq(session.groupId, groupId),
                eq(session.id, sessionId)
            ));
        
        if (!returnSession) {
            return badRequest({ message: 'Session not found' });
        }
        const response = await fetch(`/api/group/${groupId}/session/${sessionId}/sessionmember`);
        const body = await response.json();
        
        const sessionObj: Session = {
            id: returnSession.id as UUID,
            groupId: returnSession.groupId as UUID,
            ruleset: returnSession.ruleset,
            plannedRounds: returnSession.plannedRounds,
            startedAt: returnSession.startedAt,
            endedAt: returnSession.endedAt,
            members: body as SessionMember[]
        };
        return ok(sessionObj);
    } catch(error) {
        return serverError({ message: 'Database error while fetching Session' });
    }
};

export const PUT: RequestHandler = async({ request, params, fetch }) => {
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

        const body = await request.json();
        const newSession = body.session;
        if (!newSession || !(Session.safeParse(newSession).success)) {
            return badRequest({ message: 'Session required' });
        }

        const [updatedSession] = await db
            .update(session)
            .set({
                plannedRounds: newSession.plannedRounds,
                endedAt: newSession.endedAt,
            })
            .where(eq(session.id, sessionId))
            .returning();

        if (!updatedSession) {
            return badRequest({ message: 'Session not found' });
        }

        return ok({ message: 'Updated Session', session: updatedSession as Session })
    } catch(error) {
        return serverError({ message: 'Database error while updating Session' });
    }
};