import { badRequest, created, ok, serverError } from "$lib/http";
import type { RequestHandler } from "@sveltejs/kit";
import { UUID as UUIDSchema, Session, Ruleset, ISODate, UUID, SessionMember, ReturnSessionMember } from "$lib/types";
import { db } from "$lib/server/db";
import { session } from "$lib/server/db/schema";
import { eq } from "drizzle-orm";
import z from "zod";
import { readValidatedBody } from "$lib/validation";
import { generateReturnMember } from "$lib/utils";

/**
 * 1. GET /api/group/[group]/session
 * Request: Keine
 * Response 200: [Session]
 * Response 400: { "message": string }
 * Response 500: { "message": string }
 * 
 * 2. POST /api/group/[group]/session
 * Request Body:
 * {
 * "ruleset": Ruleset,
 * "plannedRounds": number,
 * "startedAt"?: ISODate
 * }
 * Response 201: { "message": string, session: Session }
 * Response 400: { "message": string }
 * Response 500: { "message": string }
 */

/**
 * Ruft alle Sessions ab die zu einer bestimmten Gruppe gehören
 * @param params URL-Parameter
 * @param fetch SvelteKit fetch-Funktion
 * @returns Response
 */
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

        // Prüfen ob Gruppe existiert
        const groupResponse = await fetch(`/api/group/${groupId}`);
        if (groupResponse.status != 200) {
            return badRequest({ message: 'PlayGroup not found' });
        }

        // Sessions aus DB abrufen
        const sessionsFromDB = await db
            .select()
            .from(session)
            .where(eq(session.groupId, groupId));

        const sessions: Session[] = [];
        // Jede Session mit Mitgliedern vervollständigen
        for (let i = 0; i < sessionsFromDB.length; i++) {
            const session = sessionsFromDB[i];
            
            // Abfrage der SessionMember
            const response = await fetch(`/api/group/${groupId}/session/${session.id}/sessionmember`)
            const body = await response.json();

            // Vervollständigung der ReturnSessionMember
            const list: ReturnSessionMember[] = [];
            for (let i = 0; i < body.length; i++) {
                // Player Details hinzufügen
                const obj = await generateReturnMember(body[i].memberId);
                list.push(obj as ReturnSessionMember);
            }

            sessions.push({
                id: session.id as UUID,
                groupId: session.groupId as UUID,
                ruleset: session.ruleset,
                plannedRounds: session.plannedRounds,
                startedAt: session.startedAt,
                endedAt: session.endedAt,
                members: list
            });
        }

        
        return ok(sessions);
    } catch(error) {
        return serverError({ message: 'Database error while fetching Session[]' })
    }
};

/**
 * Erstellt eine neue Session für die Gruppe
 * @param event Event, enthält den Body zur validierung
 * @returns Response
 */
export const POST: RequestHandler = async(event) => {
    const bodySchema = z.object({
        ruleset: Ruleset,
        plannedRounds: z.number().int().min(1),
        startedAt: ISODate.optional().nullable(),
    });
    const { ruleset, plannedRounds, startedAt } = await readValidatedBody(event, bodySchema);

    try {
        const groupId = event.params.group;
        if (!groupId || !(UUID.safeParse(groupId)) ) {
            return badRequest({ message: 'PlayGroup ID required' });
        }

        // Prüfen ob Gruppe existiert
        const groupResponse = await event.fetch(`/api/group/${groupId}`);
        if (groupResponse.status != 200) {
            return badRequest({ message: 'PlayGroup not found' });
        }

        // Session in DB erstellen
        const [createdSession] = await db
            .insert(session)
            .values({
                groupId: groupId,
                ruleset: ruleset,
                plannedRounds: plannedRounds,
                startedAt: startedAt
            })
            .returning();
        
        if (!createdSession) {
            return badRequest({ message: 'Session could not be created' });
        }

        const sessionId = createdSession.id;

        // Mitgliederliste abrufen und vervollständigen
        const response = await event.fetch(`/api/group/${groupId}/session/${sessionId}/sessionmember`);
        const body = (await response.json()) as SessionMember[];
        
        const list: ReturnSessionMember[] = [];
        for (let i = 0; i < body.length; i++) {
            const obj = await generateReturnMember(body[i].memberId);
            list.push(obj as ReturnSessionMember);
        }

        // Session-Objekt zusammenstellen
        const sessionObj: Session = {
            id: createdSession.id as UUID,
            groupId: createdSession.groupId as UUID,
            ruleset: createdSession.ruleset,
            plannedRounds: createdSession.plannedRounds,
            startedAt: createdSession.startedAt,
            endedAt: createdSession.endedAt,
            members: list
        };

        return created({ message: 'Created Session', session: sessionObj as Session });
    } catch(error) {
        return serverError({ message: 'Database error while creating Session' });
    } 
};