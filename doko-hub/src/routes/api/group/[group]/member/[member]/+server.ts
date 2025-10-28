import { BadResponse, ErrorResponse, GETResponse, PUTOrDeleteResponse } from "$lib/responses";
import { db } from "$lib/server/db";
import { groupInvite, playgroupMember } from "$lib/server/db/schema";
import type { PlayerIdentity, PlayerStatus, PlayGroupMember } from "$lib/types";
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

        const member: PlayGroupMember = {
            groupId: membersFromDB[0].groupId,
            playerId: membersFromDB[0].playerId,
            nickname: membersFromDB[0].nickname,
            status: membersFromDB[0].status as PlayerStatus,
            leftAt: membersFromDB[0].leftAt?.toISOString()
        }

        return new GETResponse(member);
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

        const member: PlayGroupMember = {
            groupId: updatedMember.groupId,
            playerId: updatedMember.playerId,
            nickname: updatedMember.nickname,
            status: updatedMember.status as PlayerStatus,
            leftAt: updatedMember.leftAt?.toISOString()
        }

        return new PUTOrDeleteResponse('Updated member', {name: 'playGroupMember', data: member});
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

        const [deletedMember] = await db
            .delete(playgroupMember)
            .where(and(
                eq(playgroupMember.groupId, groupId),
                eq(playgroupMember.playerId, memberId)
            ))
            .returning();
        
        if (!deletedMember) {
            return new BadResponse('Member not found');
        }

        // Pruefen ob noch registrierte Nutzer in der Gruppe sind
        handlePlayGroupMemberLeave(groupId, fetch);

        const member: PlayGroupMember = {
            groupId: deletedMember.groupId,
            playerId: deletedMember.playerId,
            nickname: deletedMember.nickname,
            status: deletedMember.status as PlayerStatus,
            leftAt: deletedMember.leftAt?.toISOString()
        }

        return new PUTOrDeleteResponse('Deleted member', {name: 'playGroupMember', data: member});
    } catch(error) {
        return new ErrorResponse('Database error while deleting member');
    }
};

/**
 * Diese Methode prueft ob noch registrierte Nutzer in der Gruppe sind.
 * Falls nicht wird diese geloescht.
 * 
 * @param groupId 
 */
async function handlePlayGroupMemberLeave(groupId: string, fetch: typeof globalThis.fetch) {
    const response = await fetch(`/api/group/${groupId}/member`);
    
    if (!response.ok) {
        return;
    }

    const memberList: PlayGroupMember[] = await response.json();
    
    let hasIdentity = false;
    for (const member of memberList) {
        const memberIdentityResponse = await fetch(`/api/player/${member.playerId}/identity`);
        if (!memberIdentityResponse.ok) {
            continue;
        }
        const identity = (await memberIdentityResponse.json()) as PlayerIdentity | null;
        if (identity) {
            hasIdentity = true;
            break;
        }
    }

    if (hasIdentity) {
        return;
    }

    // Keine Member (Player) mit Identity mehr in der Gruppe => Gruppe und alle Abhängigkeiten loeschen

    // Member loeschen
    for (const member of memberList) {
        await fetch(`/api/group/${groupId}/member/${member.playerId}`, {
            method: "DELETE"
        });
    }

    // Invites loeschen
    await db
            .delete(groupInvite)
            .where(eq(groupInvite.groupId, groupId));

    // TODO: Sessions loeschen

    // Gruppe löschen
    await fetch(`/api/group/${groupId}`, {
        method: "DELETE"
    });
}