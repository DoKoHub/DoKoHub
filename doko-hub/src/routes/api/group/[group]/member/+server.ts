import { badRequest, created, ok, serverError } from "$lib/http";
import { db } from "$lib/server/db";
import { playgroupMember } from "$lib/server/db/schema";
import { Name, UUID, type PlayerStatus, type PlayGroupMember } from "$lib/types";
import { isPlayGroupMember } from "$lib/utils";
import { readValidatedBody } from "$lib/validation";
import type { RequestHandler } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import z from "zod";

/**
 * 1. GET /api/group/[group]/member
 * Request: Keine
 * Response 200: [PlayGroupMember]
 * Response 400: { "message": string }
 * Response 500: { "message": string }
 * 
 * 2. POST /api/group/[group]/member
 * Request Body:
 * {
 * "playerId": UUID,
 * "nickname"?: string
 * }
 * Response 201: { "message": string, playGroupMember: PlayGroupMember }
 * Response 400: { "message": string }
 * Response 500: { "message": string }
 */

/**
 * Ruft alle Mitglieder einer Spielgruppe ab
 * @param params URL-Parameter
 * @returns Response
 */
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

/**
 * Fügt einen Spieler als neues, aktives Mitglied zu einer Gruppe hinzu, maximal 4 Mitglieder
 * @param event Event, enthält den Body zur validierung
 * @returns Response
 */
export const POST: RequestHandler = async(event) => {
    const bodySchema = z.object({
      playerId: UUID.optional(), // optional, wegen lokalen Spielern
      nickname: Name.optional(), // optional, wird bei Invalid fallbacken
    });
    const { playerId, nickname } = await readValidatedBody(event, bodySchema);

    try {
        // UUID der Gruppe
        const groupId = event.params.group;

        if (!groupId || !(UUID.safeParse(groupId).success)) {
            return badRequest({ message: 'PlayGroup ID required' })
        }

       

      // Vor Beitritt prüfen, ob bereits 4 aktive Mitglieder in der Gruppe sind

        const existingMembers = await db
            .select()
            .from(playgroupMember)
            .where(eq(playgroupMember.groupId, groupId)); //Mitglieder der Gruppe laden


        const activeCount = existingMembers.filter(m => m.status === 'ACTIVE').length; //nur ACTIVE-Mitglieder zählen

        if (activeCount >= 4) {
            return badRequest({
                message: 'This PlayGroup is already full (max. 4 active members).', //Beitritt blocken, wenn Gruppe voll ist
            });
        }
        

        // Prüfen ob Gruppe existiert
        const groupResponse = await event.fetch(`/api/group/${groupId}`);
        if (groupResponse.status != 200) {
            return badRequest({ message: 'PlayGroup not found' })
        }
    
        let memberPlayerId: UUID | null = null;
        let memberNickname: Name | undefined = nickname;

        if (playerId) {
            // Prüfen ob Spieler existiert
            const playerResponse = await event.fetch(`/api/player/${playerId}`);
            // Prüfen ob Spieler bereits Mitglied ist
            if (await isPlayGroupMember(groupId, playerId)) {
                return badRequest({ message: 'Player is a member already' });
            }

            if (playerResponse.status != 200) {
                // Erstelle lokalen Spieler
                memberPlayerId = null; 
            } else {
                // Spieler gefunden, verwende dessen ID und Name
                const player = await playerResponse.json();
                memberPlayerId = player.id as UUID;
                
                // Setze den Nickname falls keiner gesendet wurde
                if (!memberNickname) {
                    memberNickname = player.name;
                }
            }
        } else {
            // Lokaler Spieler
            memberPlayerId = null;
        }

        if (!memberNickname && memberPlayerId === null) {
             memberNickname = "Lokaler Spieler";
        }
        

        // Neues Mitglied hinzufügen
        const [playgroupMemberFromDB] = await db
            .insert(playgroupMember)
            .values({
                groupId: groupId as UUID,
                playerId: memberPlayerId,
                nickname: memberNickname,
                status: "ACTIVE" as PlayerStatus
            })
            .returning();

        return created({ message: 'Created PlayGroupMember', playGroupMember: playgroupMemberFromDB as PlayGroupMember });
    } catch(error) {
        return serverError({ message: 'Database error while creating PlayGroupMember' });
    }
};