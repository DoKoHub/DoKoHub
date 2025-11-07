import { BadResponse, ErrorResponse, POSTResponse } from "$lib/responses";
import { db } from "$lib/server/db";
import { groupInvite } from "$lib/server/db/schema";
import type { GroupInvite } from "$lib/types";
import type { RequestHandler } from "@sveltejs/kit";


export const POST: RequestHandler = async({ request, params, fetch }) => {
    try {
        const groupId = params.group;

        if (!groupId) {
            return new BadResponse('PlayGroup ID Required');
        }

        const groupResponseBody = await (await fetch(`/api/group/${groupId}`)).json();
        if (!groupResponseBody) {
            return new BadResponse('PlayGroup not found');
        }

        const body = await request.json();

        const expireDate = body.expiresAt;
        const createdBy = body.createdBy;

        if (!expireDate || !createdBy) {
            return new BadResponse('expiresAt Date and createdBy (Player) ID required');
        }

        const creationTemplate = {
            groupId: groupId,
            token: createToken(),
            expiresAt: expireDate ? new Date(expireDate) : undefined,
            createdBy: createdBy
        }

        const [invite] = await db
            .insert(groupInvite)
            .values(creationTemplate)
            .returning();

        return new POSTResponse('Created GroupInvite', {name: 'groupInvite', data: invite as GroupInvite});
    } catch (error) {
        return new ErrorResponse('Database error while creating GroupInvite')
    }
}

function createToken(): string {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < 64; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}