import { and, eq } from "drizzle-orm";
import { db } from "./server/db";
import { sessionMember } from "./server/db/schema";

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