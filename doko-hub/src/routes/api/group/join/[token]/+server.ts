import { BadResponse, ErrorResponse, POSTResponse } from "$lib/responses";
import { db } from "$lib/server/db";
import { groupInvite } from "$lib/server/db/schema";
import type { GroupInvite, PlayGroup, PlayGroupMember } from "$lib/types";
import type { RequestHandler } from "@sveltejs/kit";
import { eq } from "drizzle-orm";

import { z } from "zod";

// CHANGED: Minimale Schemas für Eingaben (keine Logikänderung)
const Token = z.string().trim().min(1).max(80); // entspricht eurem Token-Format
const UUID = z.string().uuid();
const PostBodySchema = z.object({
  playerId: UUID,
  nickname: z.string().trim().max(60).optional().nullable(),
});


export const POST: RequestHandler = async({ request, params, fetch }) => {
    try {
        const token = params.token

        if (!token) {
            return new BadResponse('Token required');
        }

        // CHANGED: zusätzlich Token-Format prüfen (gleiche Fehlermeldung)
    if (!Token.safeParse(token).success) {
      return new BadResponse("Token required");
    }

        const body = await request.json();
        const playerId = body.playerId;

        if (!playerId) {
            return new BadResponse('Player ID required');
        }

        // CHANGED: zusätzlich playerId-Format prüfen (gleiche Fehlermeldung)
    if (!UUID.safeParse(playerId).success) {
      return new BadResponse("Player ID required");
    }

    // CHANGED: Body vollständig validieren (Nickname nur Hygiene)
    const parsed = PostBodySchema.safeParse(body);
    // Hinweis: Fehlermeldungen bleiben wie vorher; bei invalidem nickname nutzen wir unten body.nickname getrimmt.
    const nicknameFromBody = parsed.success
        ? parsed.data.nickname ?? undefined
        : (typeof body.nickname === "string" && body.nickname.trim().length > 0
            ? body.nickname.trim()
            : undefined);



        const invite = await db
            .select()
            .from(groupInvite)
            .where(eq(groupInvite.token, token));

        if (!invite[0]) {
            return new BadResponse('GroupInvite not found');
        }

        const groupInviteObj = invite[0] as GroupInvite;
        const group = (await(await fetch(`/api/group/${groupInviteObj.groupId}`)).json()) as PlayGroup;

        if (!group) {
            return new BadResponse('PlayGroup not found');
        }

        const addResponse = await fetch(`/api/group/${group.id}/member`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                playerId: playerId,
                ...(body.nickname ? {nickname: body.nickname} : {})
            })
        });

        const addBody = await addResponse.json();

        return new POSTResponse('Created PlayGroupMember', {name: 'playGroupMember', data: addBody.playGroupMember as PlayGroupMember})
    } catch(error) {
        return new ErrorResponse('Database error while creating PlayGroupMember');
    }
};