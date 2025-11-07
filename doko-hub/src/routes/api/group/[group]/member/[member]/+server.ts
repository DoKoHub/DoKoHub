import { BadResponse, ErrorResponse, GETResponse, PUTOrDeleteResponse } from "$lib/responses";
import { db } from "$lib/server/db";
import { playgroupMember } from "$lib/server/db/schema";
import type { PlayerStatus, PlayGroupMember } from "$lib/types";
import type { RequestHandler } from "@sveltejs/kit";
import { and, eq } from "drizzle-orm";


export const GET: RequestHandler = async({ params }) => {
    try {
        const groupId = params.group;
        const memberId = params.member;
        
        //Falls Gruppen UUID leer ist
        if (!groupId) {
            return new BadResponse('PlayGroup ID required');
        }
        //Falls Mitglieds UUID leer ist
        if (!memberId) {
            return new BadResponse('PlayGroupMember (Player) ID required');
        }

        const membersFromDB = await db
            .select()
            .from(playgroupMember)
            .where(and(
                eq(playgroupMember.groupId, groupId),
                eq(playgroupMember.playerId, memberId)
            ));
        
        if (!membersFromDB[0]) {
            return new BadResponse('PlayGroupMember not found');
        }

        return new GETResponse(membersFromDB[0] as PlayGroupMember);
    } catch(error) {
        return new ErrorResponse('Database error while fetching PlayGroupMember');
    }
};

export const PUT: RequestHandler = async({ request, params }) => {
    try {
        const groupId = params.group;
        const memberId = params.member;
        
        //Falls Gruppen UUID leer ist
        if (!groupId) {
            return new BadResponse('PlayGroup ID required');
        }
        //Falls Mitglieds UUID leer ist
        if (!memberId) {
            return new BadResponse('PlayGroupMember (Player) ID required');
        }

        const body = await request.json();
        const newMember = body.playGroupMember;

        if (!newMember) {
            return new BadResponse('Valid PlayGroupMember required');
        }

        const [updatedMember] = await db
            .update(playgroupMember)
            .set(newMember)
            .where(and(
                eq(playgroupMember.groupId, groupId),
                eq(playgroupMember.playerId, memberId)
            ))
            .returning();
        
        if (!updatedMember) {
            return new BadResponse('PlayGroupMember not found');
        }

        return new PUTOrDeleteResponse('Updated PlayGroupMember', {name: 'playGroupMember', data: updatedMember as PlayGroupMember});
    } catch(error) {
        return new ErrorResponse('Database error while updating PlayGroupMember');
    }
};

export const DELETE: RequestHandler = async({ params }) => {
    try {
        const groupId = params.group;
        const memberId = params.member;
        
        //Falls Gruppen UUID leer ist
        if (!groupId) {
            return new BadResponse('PlayGroup ID required');
        }
        //Falls Mitglieds UUID leer ist
        if (!memberId) {
            return new BadResponse('PlayGroupMember (Player) ID required');
        }

        // Nicht loeschen, aber Member auf "LEFT" setzen 

        const [deletedMember] = await db
            .update(playgroupMember)
            .set({
                status: "LEFT" as PlayerStatus,
                leftAt: new Date()
            })
            .where(and(
                eq(playgroupMember.groupId, groupId),
                eq(playgroupMember.playerId, memberId)
            ))
            .returning();
        
        if (!deletedMember) {
            return new BadResponse('PlayGroupMember not found');
        }

        return new PUTOrDeleteResponse('Deleted PlayGroupMember', {name: 'playGroupMember', data: deletedMember as PlayGroupMember});
    } catch(error) {
        return new ErrorResponse('Database error while deleting PlayGroupMember');
    }
};