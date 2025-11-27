import { badRequest, created, serverError } from "$lib/http";
import { db } from "$lib/server/db";
import { groupInvite} from "$lib/server/db/schema";
import { Token, UUID, type GroupInvite, type PlayGroup, type PlayGroupMember } from "$lib/types";
import { readValidatedBody } from "$lib/validation";
import type { RequestHandler } from "@sveltejs/kit";
import { eq } from "drizzle-orm";

import { z } from "zod";

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

        const invite = await db
            .select()
            .from(groupInvite)
            .where(eq(groupInvite.token, token));

        if (!invite[0]) {
            return badRequest({ message: 'GroupInvite not found' });
        }

        const groupInviteObj = invite[0] as GroupInvite;
        const groupBody = await event.fetch(`/api/group/${groupInviteObj.groupId}`);
        if (groupBody.status != 200) {
            return badRequest({ message: 'PlayGroup not found' });
        }

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

        return created({ message: 'Created PlayGroupMember', playgroupMember: addBody.playGroupMember as PlayGroupMember });
    } catch(error) {
        return serverError({ message: 'Database error while creating PlayGroupMember' })
    }
};