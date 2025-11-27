import { badRequest, ok, serverError } from "$lib/http";
import { db } from "$lib/server/db";
import { session, sessionMember, playgroupMember, player, round, roundParticipation, roundCall, roundBonus } from "$lib/server/db/schema";
import { UUID } from "$lib/types";
import type { RequestHandler } from "@sveltejs/kit";
import { eq, inArray } from "drizzle-orm"; 
import type { $brand } from "zod";

// Definiert den erwarteten UUID-Typ
type BrandedUUID = string & $brand<"UUID">;

const BASE_POINTS = 1;

const CALL_POINTS: { [key: string]: number } = {
    'RE': 1,
    'KONTRA': 1,
    'KEINE90': 1,
    'KEINE60': 1,
    'KEINE30': 1,
    'SCHWARZ': 1,
};

// Punkte für Sonderboni
const BONUS_POINTS: { [key: string]: number } = {
    'DOKO': 1,
    'FUCHS': 1,
    'KARLCHEN': 1,
    'LAUFENDE': 1,
    'GEGEN_DIE_ALTEN': 1,
};

/**
 * Berechnet die Spielergebnisse für eine Session basierend auf den Standardregeln.
 * @param sessionData Daten der Session mit Runden, Teilnahmen, Calls und Boni.
 * @returns Map<memberId, number> der Gesamtpunkte.
 */
function calculateSessionResults(sessionData: any): Map<BrandedUUID, number> {
    const results = new Map<BrandedUUID, number>();

    sessionData.rounds.forEach((r: any) => {
        let roundValue = 0;

        const isSoloOrHochzeit = r.gameType.startsWith('SOLO_') || r.gameType === 'HOCHZEIT';

        const reMembers: BrandedUUID[] = r.participations
            .filter((p: any) => p.side === 'RE' || p.side === 'SOLIST')
            .map((p: any) => p.memberId);

        const kontraMembers: BrandedUUID[] = r.participations
            .filter((p: any) => p.side === 'KONTRA')
            .map((p: any) => p.memberId);

        const isReWon = r.eyesRe > 120;
        const eyesRe = r.eyesRe;
        const winningMembers = isReWon ? reMembers : kontraMembers;
        const losingMembers = isReWon ? kontraMembers : reMembers;

        roundValue += BASE_POINTS;

        if (isSoloOrHochzeit) {
            roundValue += BASE_POINTS; 
        }

        const reEyeTarget = 240 - eyesRe;
        
        if (reEyeTarget <= 90) roundValue += CALL_POINTS['KEINE90'];
        if (reEyeTarget <= 60) roundValue += CALL_POINTS['KEINE60'];
        if (reEyeTarget <= 30) roundValue += CALL_POINTS['KEINE30'];
        if (reEyeTarget === 0) roundValue += CALL_POINTS['SCHWARZ'];

        r.calls.forEach((callData: any) => {
        const call = callData.call;
        const callingTeamIsRe = reMembers.includes(callData.memberId);
        const callWasSuccessful = (callingTeamIsRe && isReWon) || (!callingTeamIsRe && !isReWon);

        if (callWasSuccessful) {
            roundValue += CALL_POINTS[call] || 0;
        }
    });

        r.bonuses.forEach((bonusData: any) => {
            const bonus = bonusData.bonus;
            const memberId = bonusData.memberId;
            let bonusPoints = BONUS_POINTS[bonus] || 0;

            const currentPoints = results.get(memberId) || 0;
            results.set(memberId, currentPoints + bonusPoints);
        });

        winningMembers.forEach(memberId => {
            const currentPoints = results.get(memberId) || 0;
            results.set(memberId, currentPoints + roundValue);
        });

        losingMembers.forEach(memberId => {
            const currentPoints = results.get(memberId) || 0;
            results.set(memberId, currentPoints - roundValue);
        });
    });

    return results; 
}


export const GET: RequestHandler = async ({ params }) => {
    const { session: sessionId } = params;

    if (!sessionId || !UUID.safeParse(sessionId).success) {
        return badRequest({ message: 'Invalid session ID format or missing ID.' });
    }

    const typedSessionId: BrandedUUID = sessionId as BrandedUUID;

    try {
        const sessionExists = await db.select({ id: session.id })
            .from(session)
            .where(eq(session.id, typedSessionId))
            .limit(1);
        
        if (sessionExists.length === 0) {
            return badRequest({ message: 'Session not found' });
        }

        const rounds = await db.select()
            .from(round)
            .where(eq(round.sessionId, typedSessionId));

        if (rounds.length === 0) {
            const membersWithPlayerInfo = await db.select({
                playerId: player.id,
                playerName: player.name,
                memberId: sessionMember.memberId, 
                seatPos: sessionMember.seatPos,
            })
            .from(sessionMember)
            .innerJoin(playgroupMember, eq(playgroupMember.id, sessionMember.memberId))
            .innerJoin(player, eq(player.id, playgroupMember.playerId))
            .where(eq(sessionMember.sessionId, typedSessionId));

            const playersWithResults = membersWithPlayerInfo.map(member => ({
                player_id: member.playerId,
                member_id: member.memberId,
                player_name: member.playerName,
                seat_pos: member.seatPos,
                points: 0 
            }));

            return ok({ 
                sessionResults: playersWithResults,
                message: 'No rounds in session. Results are 0 for all participants.'
            });
        }

        const roundIds = rounds.map(r => r.id);

        const roundIdsTyped = roundIds as BrandedUUID[]; 

        const participations = await db.select()
            .from(roundParticipation)
            .where(inArray(roundParticipation.roundId, roundIdsTyped));

        const calls = await db.select()
            .from(roundCall)
            .where(inArray(roundCall.roundId, roundIdsTyped));

        const bonuses = await db.select()
            .from(roundBonus)
            .where(inArray(roundBonus.roundId, roundIdsTyped));

        const sessionData = {
            rounds: rounds.map(r => ({
                ...r,
                participations: participations.filter(p => p.roundId === r.id) as any[], 
                calls: calls.filter(c => c.roundId === r.id) as any[],
                bonuses: bonuses.filter(b => b.roundId === r.id) as any[],
            }))
        };
        
        const resultsMap = calculateSessionResults(sessionData);

        const membersWithPlayerInfo = await db.select({
            playerId: player.id,
            playerName: player.name,
            memberId: sessionMember.memberId, 
            seatPos: sessionMember.seatPos,
        })
        .from(sessionMember)
        .innerJoin(playgroupMember, eq(playgroupMember.id, sessionMember.memberId))
        .innerJoin(player, eq(player.id, playgroupMember.playerId))
        .where(eq(sessionMember.sessionId, typedSessionId));

        const playersWithResults = membersWithPlayerInfo.map(member => {
            return {
                player_id: member.playerId,
                member_id: member.memberId, 
                player_name: member.playerName, 
                seat_pos: member.seatPos,
                points: resultsMap.get(member.memberId as BrandedUUID) || 0 
            };
        });

        return ok({ 
            sessionResults: playersWithResults,
            message: 'Session results calculated successfully.'
        });

    } catch(error) {
        console.error('Error fetching and calculating session results:', error);
        return serverError({ message: 'Database error while calculating session results.' });
    }
};