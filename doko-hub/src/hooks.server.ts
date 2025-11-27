import { cleanupExpiredInvites } from "$lib/server/cleanup-invites";

function startCleanupInterval(intervalMs = 1 * 60 * 1000) {
    setInterval(() => {
        cleanupExpiredInvites()
            .then(() => console.log('Expired invites cleanup!'))
            .catch((error) => console.error(error));
    }, intervalMs);

    // 1 run when starting
    cleanupExpiredInvites().catch(console.error);
}

// Make sure cleanup gets started just once
if (!(globalThis as any).__inviteCleanupStarted) {
    startCleanupInterval();

    (globalThis as any).__inviteCleanupStarted = true;
}