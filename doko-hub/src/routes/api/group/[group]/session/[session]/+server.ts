import { badRequest, serverError, ok } from "$lib/http";
import type { RequestHandler } from "@sveltejs/kit";
import { ReturnSessionMember, Ruleset, Session, SessionMember, UUID } from "$lib/types";
import { db } from "$lib/server/db";
import { session } from "$lib/server/db/schema";
import { and, eq } from "drizzle-orm";
import { generateReturnMember } from "$lib/utils";

/**
 * 1. GET /api/group/[group]/session/[session]
 * Request: Keine
 * Response 200: Session
 * Response 400: { "message": string }
 * Response 500: { "message": string }
 * 
 * 2. PUT /api/group/[group]/session/[session]
 * Request Body:
 * {
 * "session": Session
 * }
 * Response 200: { "message": string, session: Session }
 * Response 400: { "message": string }
 * Response 500: { "message": string }
 */

/**
 * Ruft eine einzelne Session ab, die zu einer bestimmten Gruppe gehört
 * @param params URL-Parameter
 * @param fetch SvelteKit fetch-Funktion
 * @returns Response
 */
export const GET: RequestHandler = async ({ params, fetch }) => {
  try {
    const groupId = params.group;
    const sessionId = params.session;

    if (!groupId || !UUID.safeParse(groupId).success) {
      return badRequest({ message: "PlayGroup ID required" });
    }

    if (!sessionId || !UUID.safeParse(sessionId).success) {
      return badRequest({ message: "Session ID required" });
    }

    // Prüfen ob Gruppe existiert
    const groupResponse = await fetch(`/api/group/${groupId}`);
    if (groupResponse.status != 200) {
      return badRequest({ message: "PlayGroup not found" });
    }

        // Session aus DB abrufen
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
        // Mitgliederliste abrufen
        const response = await fetch(`/api/group/${groupId}/session/${sessionId}/sessionmember`);
        const body = (await response.json()) as SessionMember[];
        
        // Mitglieder vervollständigen
        const list: ReturnSessionMember[] = [];
        for (let i = 0; i < body.length; i++) {
            // Player Details hinzufügen
            const obj = await generateReturnMember(body[i].memberId);
            list.push(obj as ReturnSessionMember);
        }

        // Session-Objekt zusammenstellen
        const sessionObj: Session = {
            id: returnSession.id as UUID,
            groupId: returnSession.groupId as UUID,
            ruleset: returnSession.ruleset,
            plannedRounds: returnSession.plannedRounds,
            startedAt: returnSession.startedAt,
            endedAt: returnSession.endedAt,
            members: list
        };
        return ok(sessionObj);
    } catch(error) {
        return serverError({ message: 'Database error while fetching Session' });
    }
};

/**
 * Aktualisiert die Daten einer bestehenden Session.
 * @param request Das Objekt für den Zugriff auf den Body
 * @param params URL-Parameter
 * @param fetch SvelteKit fetch-Funktion
 * @returns Response
 */
export const PUT: RequestHandler = async ({ request, params, fetch }) => {
  try {
    const groupId = params.group;
    const sessionId = params.session;

    if (!groupId || !UUID.safeParse(groupId).success) {
      return badRequest({ message: "PlayGroup ID required" });
    }

    if (!sessionId || !UUID.safeParse(sessionId).success) {
      return badRequest({ message: "Session ID required" });
    }

    // Prüfen ob Gruppe existiert
    const groupResponse = await fetch(`/api/group/${groupId}`);
    if (groupResponse.status != 200) {
      return badRequest({ message: "PlayGroup not found" });
    }

    // Request Body validieren
    const body = await request.json();
    const newSession = body.session;
    if (!newSession || !Session.safeParse(newSession).success) {
      return badRequest({ message: "Session required" });
    }

        // Datenbank update
        const endedAtDate = newSession.endedAt 
            ? new Date(newSession.endedAt) 
            : null;

        const [updatedSession] = await db
            .update(session)
            .set({
                plannedRounds: newSession.plannedRounds,
                endedAt: endedAtDate, 
            })
            .where(eq(session.id, sessionId))
            .returning();

    if (!updatedSession) {
      return badRequest({ message: "Session not found" });
    }

        return ok({ message: 'Updated Session', session: updatedSession as Session })
    } catch(error) {
        return serverError({ message: 'Database error while updating Session'});
    }
};
