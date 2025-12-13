import { badRequest, created, serverError } from "$lib/http";
import { db } from "$lib/server/db";
import { groupInvite} from "$lib/server/db/schema";
import { Token, UUID, type GroupInvite, type PlayGroupMember } from "$lib/types";
import { readValidatedBody } from "$lib/validation";
import type { RequestHandler } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import { z } from "zod";

/**
 * 1. POST /api/group/invite/[token]
 * Request Body:
 * {
 * "playerId": UUID,
 * "nickname"?: string
 * }
 * Response 201: { "message": string, playgroupMember: PlayGroupMember }
 * Response 400: { "message": string }
 * Response 500: { "message": string }
 */

/**
 * Akzeptiert eine Gruppeneinladung mit Token und fügt den Spieler als neues Mitglied der Gruppe hinzu
 * @param event Event, enthält den Body zur validierung
 * @returns Response
 */
export const POST: RequestHandler = async(event) => {1
    const postBodySchema = z.object({
        playerId: UUID,
        nickname: z.string().trim().max(60).optional().nullable(),
    });
    const { playerId, nickname } = await readValidatedBody(event, postBodySchema)

    try {
        const token = event.params.token

        if (!token || !(Token.safeParse(token).success)) {
            return badRequest({ message: 'Token required' });
        }

        // Einladung anhand des Tokens suchen
        const invite = await db
            .select()
            .from(groupInvite)
            .where(eq(groupInvite.token, token));

        if (!invite[0]) {
            return badRequest({ message: 'GroupInvite not found' });
        }

        const groupInviteObj = invite[0] as GroupInvite;

        // Prüfen ob Gruppe existiert
        const groupBody = await event.fetch(`/api/group/${groupInviteObj.groupId}`);
        if (groupBody.status != 200) {
            return badRequest({ message: 'PlayGroup not found' });
        }

        // Spieler hinzufügen
        const addResponse = await event.fetch(`/api/group/${groupInviteObj.groupId}/member`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                playerId: playerId,
                ...(nickname ? {nickname: nickname} : {})
            })
        });

        const addBody = await addResponse.json();

        // OK und Spieler in der Gruppe zurueckgeben
        return created({ message: 'Created PlayGroupMember', playgroupMember: addBody.playGroupMember as PlayGroupMember });
    } catch(error) {
        return serverError({ message: 'Database error while creating PlayGroupMember' })
    }
};