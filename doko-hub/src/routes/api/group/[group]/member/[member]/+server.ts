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
            return new BadResponse('Missing group id');
        }
        //Falls Mitglieds UUID leer ist
        if (!memberId) {
            return new BadResponse('Missing member id');
        }

        const membersFromDB = await db
            .select()
            .from(playgroupMember)
            .where(and(
                eq(playgroupMember.groupId, groupId),
                eq(playgroupMember.playerId, memberId)
            ));
        
        if (!membersFromDB[0]) {
            return new BadResponse('Member not found');
        }

        return new GETResponse(membersFromDB[0] as PlayGroupMember);
    } catch(error) {
        return new ErrorResponse('Database error while fetching group member');
    }
};

export const PUT: RequestHandler = async({ request, params }) => {
    try {
        const groupId = params.group;
        const memberId = params.member;
        
        //Falls Gruppen UUID leer ist
        if (!groupId) {
            return new BadResponse('Missing group id');
        }
        //Falls Mitglieds UUID leer ist
        if (!memberId) {
            return new BadResponse('Missing member id');
        }

        const body = await request.json();
        const newMember = body.playGroupMember;

        if (!newMember) {
            return new BadResponse('New playGroupMember Object needed');
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
            return new BadResponse('Member not found');
        }

        return new PUTOrDeleteResponse('Updated member', {name: 'playGroupMember', data: updatedMember as PlayGroupMember});
    } catch(error) {
        return new ErrorResponse('Database error while updating member');
    }
};

export const DELETE: RequestHandler = async({ params, fetch }) => {
    try {
        const groupId = params.group;
        const memberId = params.member;
        
        //Falls Gruppen UUID leer ist
        if (!groupId) {
            return new BadResponse('Missing group id');
        }
        //Falls Mitglieds UUID leer ist
        if (!memberId) {
            return new BadResponse('Missing member id');
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
            return new BadResponse('Member not found');
        }

        return new PUTOrDeleteResponse('Deleted member', {name: 'playGroupMember', data: deletedMember as PlayGroupMember});
    } catch(error) {
        return new ErrorResponse('Database error while deleting member');
    }
};