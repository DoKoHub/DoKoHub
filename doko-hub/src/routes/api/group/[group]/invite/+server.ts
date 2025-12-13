import { badRequest, created, serverError } from "$lib/http";
import { db } from "$lib/server/db";
import { groupInvite } from "$lib/server/db/schema";
import { UUID, type GroupInvite } from "$lib/types";
import { readValidatedBody } from "$lib/validation";
import type { RequestHandler } from "@sveltejs/kit";
import { z } from "zod";

/**
 * 1. POST /api/group/[group]/invite
 * Request Body:
 * {
 * "expiresAt": string | Date,
 * "createdBy": UUID
 * }
 * Response 201: { "message": string, groupInvite: GroupInvite }
 * Response 400: { "message": string }
 * Response 500: { "message": string }
 */

/**
 * Erstellt eine neue Einladung (Token) für eine Gruppe
 * @param event Event, enthält den Body zur validierung
 * @returns Response
 */
export const POST: RequestHandler = async(event) => {
    const bodySchema = z.object({
      expiresAt: z.coerce.date(),
      createdBy: UUID,
    });
    const { expiresAt, createdBy } = await readValidatedBody(event, bodySchema);

    try {
        const groupId = event.params.group;

        if (!groupId || !(UUID.safeParse(groupId)).success) {
            return badRequest({ message: 'PlayGroup ID Required' });
        }

        // Prüfen, ob die Gruppe existiert
        const groupResponse = await event.fetch(`/api/group/${groupId}`);
        if (groupResponse.status != 200) {
            return badRequest({ message: 'PlayGroup not found' });
        }

        // Erstellungsvorlage
        const creationTemplate = {
            groupId: groupId,
            token: createToken(),
            expiresAt: expiresAt ?? (expiresAt ? new Date(expiresAt) : undefined),
            createdBy: createdBy,
    };

        // Einladung in DB schreiben
        const [invite] = await db
            .insert(groupInvite)
            .values(creationTemplate)
            .returning();

        return created({ message: 'Created GroupInvite', groupInvite: invite as GroupInvite });
    } catch (error) {
        return serverError({ message: 'Database error while creating GroupInvite' });
    }
}

/**
 * Generiert einen zufälligen 64-stelligen alphanumerischen Token.
 * @returns string
 */
function createToken(): string {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < 64; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}