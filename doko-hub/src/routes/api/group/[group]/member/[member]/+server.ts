import { badRequest, ok, serverError } from "$lib/http";
import { db } from "$lib/server/db";
import { playgroupMember } from "$lib/server/db/schema";
import { PlayGroupMember, UUID, type PlayerStatus } from "$lib/types";
import type { RequestHandler } from "@sveltejs/kit";
import { and, eq } from "drizzle-orm";


export const GET: RequestHandler = async({ params }) => {
    try {
        const groupId = params.group;
        const memberId = params.member;
        
        if (!groupId || !(UUID.safeParse(groupId).success)) {
            return badRequest({ message: 'PlayGroup ID required' });
        }
        
        if (!memberId || !(UUID.safeParse(memberId).success)) {
            return badRequest({ message: 'PlayGroupMember ID required' });
        }

        const membersFromDB = await db
            .select()
            .from(playgroupMember)
            .where(and(
                eq(playgroupMember.groupId, groupId),
                eq(playgroupMember.id, memberId)
            ));
        
        if (!membersFromDB[0]) {
            return badRequest({ message: 'PlayGroupMember not found' });
        }

        return ok(membersFromDB[0] as PlayGroupMember);
    } catch(error) {
        return serverError({ message: 'Database error while fetching PlayGroupMember' });
    }
};

export const PUT: RequestHandler = async({ request, params }) => {
    try {
        const groupId = params.group;
        const memberId = params.member;
        
        if (!groupId || !(UUID.safeParse(groupId).success)) {
            return badRequest({ message: 'PlayGroup ID required' });
        }
        
        if (!memberId || !(UUID.safeParse(memberId).success)) {
            return badRequest({ message: 'PlayGroupMember ID required' });
        }

        const body = await request.json();
        const newMember = body.playGroupMember;

        if (!newMember || !(PlayGroupMember.safeParse(newMember).success)) {
            return badRequest({ message: 'Valid PlayGroupMember required' });
        }

        const [updatedMember] = await db
            .update(playgroupMember)
            .set(newMember)
            .where(and(
                eq(playgroupMember.groupId, groupId),
                eq(playgroupMember.id, memberId)
            ))
            .returning();
        
        if (!updatedMember) {
            return badRequest({ message: 'PlayGroupMember not found'  });
        }

        return ok({ message: 'Updated PlayGroupMember', playGroupMember: updatedMember as PlayGroupMember });
    } catch(error) {
        return serverError({ message: 'Database error while updating PlayGroupMember' });
    }
};

export const DELETE: RequestHandler = async({ params }) => {
    try {
        const groupId = params.group;
        const memberId = params.member;
        
        if (!groupId || !(UUID.safeParse(groupId).success)) {
            return badRequest({ message: 'PlayGroup ID required' });
        }
        
        if (!memberId || !(UUID.safeParse(memberId).success)) {
            return badRequest({ message: 'PlayGroupMember ID required' });
        }

        const [deletedMember] = await db
            .update(playgroupMember)
            .set({
                status: "LEFT" as PlayerStatus,
                leftAt: new Date()
            })
            .where(and(
                eq(playgroupMember.groupId, groupId),
                eq(playgroupMember.id, memberId)
            ))
            .returning();
        
        if (!deletedMember) {
            return badRequest({ message: 'PlayGroupMember not found' });
        }

        return ok({ message: 'Deleted PlayGroupMember', playgroupMember: deletedMember as PlayGroupMember });
    } catch(error) {
        return serverError({ message: 'Database error while deleting PlayGroupMember' });
    }
};