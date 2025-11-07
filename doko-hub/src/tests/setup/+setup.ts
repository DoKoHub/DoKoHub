import { db } from '$lib/server/db';
import { 
    player, 
    playgroup, 
    playerIdentity, 
    playgroupMember, 
    groupInvite 
} from '$lib/server/db/schema';

/**
 * Löscht alle relevanten Daten aus den Tabellen
 */
export async function setupDatabase(): Promise<void> {
    console.log('--- Cleaning database before test run ---');
    
    try {
        await db.delete(groupInvite);
        await db.delete(playgroupMember);
        await db.delete(playerIdentity);
        await db.delete(playgroup); 
        await db.delete(player);;
        
    } catch (error) {
        console.error('Failed to clean database', error);
    }

    console.log('--- Database cleanup successful ---');
}