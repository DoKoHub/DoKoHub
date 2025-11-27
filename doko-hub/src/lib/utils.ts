import { and, eq } from "drizzle-orm";
import { db } from "./server/db";
import { playgroup, playgroupMember, round, roundParticipation, session, sessionMember } from "./server/db/schema";

export function validateEmail(email: string): boolean {
    // Entferne umschließende einfache oder doppelte Anführungszeichen
    email = email.trim();
    if (email.startsWith("'") && email.endsWith("'")) {
        email = email.slice(1, -1);
    }

    return /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        .test(email.toLowerCase());
}

export async function isSessionMember(sessionId: string, memberId: string) {
    const member = await db
        .select()
        .from(sessionMember)
        .where(and(
            eq(sessionMember.sessionId, sessionId),
            eq(sessionMember.memberId, memberId)
        ));
    
    if (member.length == 0) {
        return false;
    } else {
        return true;
    }
}

export async function isPlayGroupMember(groupId: string, playerId: string) {
    const member = await db
        .select()
        .from(playgroupMember)
        .where(and(
            eq(playgroupMember.groupId, groupId),
            eq(playgroupMember.playerId, playerId)
        ));

    if (member.length == 0) {
        return false;
    } else {
        return true;
    }
}

export async function groupExists(groupId: string) {
    const group = await db
        .select()
        .from(playgroup)
        .where(eq(playgroup.id, groupId));

    if (group.length == 0) {
        return false;
    } else {
        return true;
    }
}

export async function sessionExists(sessionId: string) {
    const sessionFromDB = await db
        .select()
        .from(session)
        .where(eq(session.id, sessionId));

    if (sessionFromDB.length == 0) {
        return false;
    } else {
        return true;
    }
}

export async function roundExists(roundId: string) {
    const roundFromDB = await db
        .select()
        .from(round)
        .where(eq(round.id, roundId));

    if (roundFromDB.length == 0) {
        return false;
    } else {
        return true;
    }
}

export async function hasParticipationInRound(roundId: string, memberId: string) {
    const participant = await db
        .select()
        .from(roundParticipation)
        .where(and(
            eq(roundParticipation.roundId, roundId),
            eq(roundParticipation.memberId, memberId)
        ));

    if (participant.length == 0) {
        return false;
    } else {
        return true;
    }
}