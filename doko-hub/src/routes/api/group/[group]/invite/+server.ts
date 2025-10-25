import { BadResponse, ErrorResponse, POSTResponse } from "$lib/responses";
import { db } from "$lib/server/db";
import { groupInvite } from "$lib/server/db/schema";
import type { RequestHandler } from "@sveltejs/kit";


export const POST: RequestHandler = async({ request, params, fetch }) => {
    try {
        const groupId = params.group;

        if (!groupId) {
            return new BadResponse('Group ID needed');
        }

        const groupResponseBody = await (await fetch(`/api/group/${groupId}`)).json();
        if (!groupResponseBody) {
            return new BadResponse('Group not found');
        }

        const body = await request.json();

        const expireDate = body.expiresAt;
        const createdBy = body.createdBy;

        if (!expireDate || !createdBy) {
            return new BadResponse('Expire date and creating player ID needed');
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

        return new POSTResponse('Created Invite', {name: 'groupInvite', data: invite});
    } catch (error) {
        return new ErrorResponse('Error while creating group invite', error)
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