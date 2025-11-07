import { BadResponse, ErrorResponse, GETResponse, POSTResponse } from "$lib/responses";
import { db } from "$lib/server/db";
import { playgroupMember } from "$lib/server/db/schema";
import type { Player, PlayerStatus, PlayGroupMember } from "$lib/types";
import type { RequestHandler } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
// CHANGED: Zod für ergänzende Runtime-Validation
import { z } from "zod";


// CHANGED: Lokale, minimale Schemas für Format-Checks
const UUID = z.string().uuid();
const OptionalNickname = z.string().trim().max(60).optional().nullable();
const PostBodySchema = z.object({
  playerId: UUID,
  nickname: OptionalNickname, // optional, wird bei Invalid fallbacken
});

export const GET: RequestHandler = async({ params }) => {
    try {
        // UUID der Gruppe
        const groupId = params.group;

        //Falls UUID leer ist
        if (!groupId) {
            return new BadResponse('PlayGroup ID required');
        }
         // CHANGED: zusätzliches Format-Check für UUID (gleiche Fehlermeldung)
    if (!UUID.safeParse(groupId).success) {
      return new BadResponse("PlayGroup ID required");
    }

        const members = await db
            .select()
            .from(playgroupMember)
            .where(eq(playgroupMember.groupId, groupId));

        return new GETResponse(members as PlayGroupMember[]);
    } catch(error) {
        return new ErrorResponse('Database error while fetching PlayGroupMember[]');
    }
}

export const POST: RequestHandler = async({ request, params, fetch }) => {
    try {
        // UUID der Gruppe
        const groupId = params.group;

        //Falls UUID leer ist
        if (!groupId) {
            return new BadResponse('PlayGroup ID required');
        }

        // CHANGED: zusätzliches Format-Check für UUID (gleiche Fehlermeldung)
     if (!UUID.safeParse(groupId).success) {
      return new BadResponse("PlayGroup ID required");
    }

        const groupResponseBody = await (await fetch(`/api/group/${groupId}`)).json();
        if (!groupResponseBody) {
            return new BadResponse('PlayGroup not found');
        }

        const body = await request.json();

        const playerId = body.playerId;
        if (!playerId) {
            return new BadResponse('Player ID required');
        }


        // CHANGED: zusätzliches Format-Check für playerId (gleiche Fehlermeldung)
    if (!UUID.safeParse(playerId).success) {
      return new BadResponse("Player ID required");
    }



    // CHANGED: Body vollständig validieren nickname.
    // Falls NUR der Nickname invalid ist, fallbacken wir wie vorher auf player.name.
    const parsed = PostBodySchema.safeParse(body);
    const nicknameValidationFailedOnly =
      !parsed.success &&
      parsed.error.issues.every((i) => i.path[0] === "nickname");



        const player = await(await fetch(`/api/player/${playerId}`)).json() as Player;
        if (!player) {
            return new BadResponse('Player not found');
        }

        // CHANGED: Nickname bestimmen
        // - Wenn kompletter Body ok: parsed.data.nickname (bereits getrimmt)
        // - Wenn nur Nickname invalid: fallback auf player.name (original Verhalten)
       // - Wenn gar kein Nickname: original-Fallback body.nickname ?? player.name
    const nickname =
      parsed.success
        ? parsed.data.nickname ?? player.name
        : nicknameValidationFailedOnly
          ? player.name
          : (typeof body.nickname === "string" && body.nickname.trim().length > 0
              ? body.nickname.trim()
              : player.name);




        const playgroupMemberObj = {
            groupId: groupId,
            playerId: player.id,
            nickname: body.nickname ? body.nickname : player.name,
            status: "ACTIVE" as PlayerStatus
        }

        const [playgroupMemberFromDB] = await db
            .insert(playgroupMember)
            .values(playgroupMemberObj)
            .returning();

        return new POSTResponse('Created PlayGroupMember', {name: 'playGroupMember', data: playgroupMemberFromDB as PlayGroupMember});
    } catch(error) {
        return new ErrorResponse('Database error while creating PlayGroupMember');
    }
};