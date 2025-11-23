import { db } from '$lib/server/db';
import { 
    player, 
    playgroup,
    playgroupMember, 
    groupInvite, 
    session,
    sessionMember,
    round,
    roundParticipation,
    roundCall,
    roundBonus
} from '$lib/server/db/schema';

// Löscht alle relevanten Daten aus den Tabellen

export async function setupDatabase(): Promise<void> {
    console.log('--- Cleaning database before test run ---');
    
    try {
        await db.delete(roundBonus);
        await db.delete(roundCall);
        await db.delete(roundParticipation);

        await db.delete(round);
        await db.delete(sessionMember);
        await db.delete(session);

        await db.delete(playgroupMember);
        await db.delete(groupInvite);
        await db.delete(playgroup);

        await db.delete(player);
    } catch (error) {
        console.error('Failed to clean database', error);
    }

    console.log('--- Database cleanup successful ---');
}