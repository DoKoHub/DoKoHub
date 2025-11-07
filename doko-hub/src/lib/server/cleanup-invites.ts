import { lt } from "drizzle-orm";
import { groupInvite } from "./db/schema";
import { db } from "./db";

export async function cleanupExpiredInvites() {
    const now = new Date();
    await db
        .delete(groupInvite)
        .where(lt(groupInvite.expiresAt, now));
}