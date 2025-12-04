import { badRequest, ok, serverError } from "$lib/http";
import { db } from "$lib/server/db";
import {
  session,
  sessionMember,
  playgroupMember,
  player,
  round,
  roundParticipation,
  roundCall,
  roundBonus,
} from "$lib/server/db/schema";
import { UUID } from "$lib/types";
import type { RequestHandler } from "@sveltejs/kit";
import { eq, and, inArray } from "drizzle-orm";

// --- Konfiguration: wie viele Punkte geben die einzelnen Bonus-Typen? ---
const BONUS_POINTS: Record<string, number> = {
  DOKO: 1,
  FUCHS: 1,
  KARLCHEN: 1,
  LAUFENDE: 1,
  GEGEN_DIE_ALTEN: 1,
};

type RoundRow = typeof round.$inferSelect;
type ParticipationRow = typeof roundParticipation.$inferSelect;
type CallRow = typeof roundCall.$inferSelect;
type BonusRow = typeof roundBonus.$inferSelect;

/**
 * Berechnet die Punkte einer EINZELNEN Runde.
 * Rückgabe: Map memberId -> Punkte in DIESER Runde.
 */

function calculateRoundPoints(
  roundRow: RoundRow,
  participations: ParticipationRow[],
  calls: CallRow[],
  bonuses: BonusRow[]
): Record<string, number> {
  const eyesRe = roundRow.eyesRe ?? 0;
  const eyesKontra = 240 - eyesRe;

  // Welche Mitglieder gehören zu RE / KONTRA (laut round_participation)?
  const reMembers = participations
    .filter((p) => p.side === "RE")
    .map((p) => p.memberId as string);

  const kontraMembers = participations
    .filter((p) => p.side === "KONTRA")
    .map((p) => p.memberId as string);

  // Gewinnerseite nach Augen: RE gewinnt ab 121 Augen
  const winnerSide: "RE" | "KONTRA" = eyesRe >= 121 ? "RE" : "KONTRA";
  const loserSide: "RE" | "KONTRA" = winnerSide === "RE" ? "KONTRA" : "RE";

  const winnerEyes = winnerSide === "RE" ? eyesRe : eyesKontra;
  const loserEyes = 240 - winnerEyes; // Augen der verlierenden Partei

  const points: Record<string, number> = {};

  // Hilfsfunktion: Punkte für eine Partei + Gegenpartei (symmetrisch)
  const addToSide = (side: "RE" | "KONTRA", value: number) => {
    const winners = side === "RE" ? reMembers : kontraMembers;
    const losers = side === "RE" ? kontraMembers : reMembers;

    for (const m of winners) {
      points[m] = (points[m] ?? 0) + value;
    }
    for (const m of losers) {
      points[m] = (points[m] ?? 0) - value;
    }
  };

  // --- 1) Grundspiel + Stufen (keine 90 / 60 / 30 / schwarz) ---
  // Basis: 1 Punkt für Spielsieg
  let basePoints = 1;

  // Stufen nach VERLIERER-Augen (Doppelkopf-Logik)
  if (loserEyes <= 89) basePoints += 1; // "keine 90"
  if (loserEyes <= 59) basePoints += 1; // "keine 60"
  if (loserEyes <= 29) basePoints += 1; // "keine 30"
  if (loserEyes === 0) basePoints += 1; // "schwarz"

  // diese Gesamtwert bekommt die Gewinnerpartei und die Verliererpartei negativ
  addToSide(winnerSide, basePoints);

  // --- 2) Ansagen / Absagen (round_call) ---
  // Map memberId -> Partei (RE/KONTRA)
  const sideByMember: Record<string, "RE" | "KONTRA"> = {};
  for (const id of reMembers) sideByMember[id] = "RE";
  for (const id of kontraMembers) sideByMember[id] = "KONTRA";

  // Gegner-Augen aus Sicht einer Partei (für KEINE90/60/30/SCHWARZ)
  const opponentEyes = (side: "RE" | "KONTRA") =>
    side === "RE" ? eyesKontra : eyesRe;

  for (const c of calls) {
    const memberId = c.memberId as string;
    const side = sideByMember[memberId]; // RE oder KONTRA
    // if (!side) continue;

    const callType = c.call as string;
    const winsGame = winnerSide === side;
    const oppEyes = opponentEyes(side);

    let success = false;

    // Erfolgskriterien je Call-Typ
    switch (callType) {
      case "RE":
      case "KONTRA":
        // RE-Ansage / Kontra-Ansage erfolgreich, wenn diese Partei gewinnt
        success = winsGame;
        break;
      case "KEINE90":
        success = winsGame && oppEyes <= 89;
        break;
      case "KEINE60":
        success = winsGame && oppEyes <= 59;
        break;
      case "KEINE30":
        success = winsGame && oppEyes <= 29;
        break;
      case "SCHWARZ":
        success = winsGame && oppEyes === 0;
        break;
      default:
        break;
    }

    const callPoint = success ? 1 : -1;

    // Call wirkt wie eine zusätzliche Stufe:
    // rufende Partei +1/-1, Gegenpartei -1/+1
    addToSide(side, callPoint);
  }

  // --- 3) Sonderpunkte pro Spieler (round_bonus) ---
  // WICHTIG: jeder Eintrag in round_bonus zählt separat
  // → d.h. ein Spieler kann in einer Runde 2x DOKO haben und bekommt dann 2x Punkte
  for (const b of bonuses) {
    const memberId = b.memberId as string;
    const bonusType = b.bonus as string;
    const value = BONUS_POINTS[bonusType] ?? 1;

    points[memberId] = (points[memberId] ?? 0) + value;
  }

  return points;
}

/**
 * GET /api/group/:group/session/:session/result
 * Berechnet das Endergebnis (Punkte) für alle Session-Teilnehmer.
 */
export const GET: RequestHandler = async ({ params }) => {
  const groupId = params.group;
  const sessionId = params.session;

  // 1) Params validieren (UUID-Check)
  if (!groupId || !UUID.safeParse(groupId).success) {
    return badRequest({ message: "Invalid or missing group ID" });
  }
  if (!sessionId || !UUID.safeParse(sessionId).success) {
    return badRequest({ message: "Invalid or missing session ID" });
  }

  try {
    // 2) Session holen und prüfen, ob sie wirklich zu dieser Gruppe gehört
    const [sessionRow] = await db
      .select()
      .from(session)
      .where(and(eq(session.id, sessionId), eq(session.groupId, groupId)));

    if (!sessionRow) {
      return badRequest({ message: "Session not found for this group" });
    }

    // 3) Alle Session-Mitglieder inkl. Player-Infos (wird immer gebraucht)
    const membersWithPlayerInfo = await db
      .select({
        playerId: player.id,
        playerName: player.name,
        memberId: sessionMember.memberId,
        seatPos: sessionMember.seatPos,
      })
      .from(sessionMember)
      .innerJoin(
        playgroupMember,
        eq(playgroupMember.id, sessionMember.memberId)
      )
      .innerJoin(player, eq(player.id, playgroupMember.playerId))
      .where(eq(sessionMember.sessionId, sessionId));

    // 4) Alle Runden dieser Session holen
    const rounds = await db
      .select()
      .from(round)
      .where(eq(round.sessionId, sessionId));

    // Falls noch keine Runde gespielt: alle 0 Punkte zurückgeben
    if (rounds.length === 0) {
      const playersWithResults = membersWithPlayerInfo.map((member) => ({
        player_id: member.playerId,
        member_id: member.memberId,
        player_name: member.playerName,
        seat_pos: member.seatPos,
        points: 0,
      }));

      return ok({
        sessionResults: playersWithResults,
        message: "No rounds in session. Results are 0 for all participants.",
      });
    }

    const roundIds = rounds.map((r) => r.id as string);

    // 5) Beteiligungen / Calls / Boni für alle Runden aus der DB holen
    const participations = await db
      .select()
      .from(roundParticipation)
      .where(inArray(roundParticipation.roundId, roundIds));

    const calls = await db
      .select()
      .from(roundCall)
      .where(inArray(roundCall.roundId, roundIds));

    const bonuses = await db
      .select()
      .from(roundBonus)
      .where(inArray(roundBonus.roundId, roundIds));

    // 6) Nach roundId gruppieren, damit wir pro Runde rechnen können
    const partsByRound: Record<string, ParticipationRow[]> = {};
    const callsByRound: Record<string, CallRow[]> = {};
    const bonusByRound: Record<string, BonusRow[]> = {};

    for (const p of participations) {
      const rid = p.roundId as string;
      (partsByRound[rid] ??= []).push(p);
    }
    for (const c of calls) {
      const rid = c.roundId as string;
      (callsByRound[rid] ??= []).push(c);
    }
    for (const b of bonuses) {
      const rid = b.roundId as string;
      (bonusByRound[rid] ??= []).push(b);
    }

    // 7) Scoreboard initialisieren: alle Session-Mitglieder starten bei 0
    const scoreMap: Record<string, number> = {};
    for (const m of membersWithPlayerInfo) {
      scoreMap[m.memberId as string] = 0;
    }

    // 8) Für jede Runde Punkte berechnen und aufsummieren
    for (const r of rounds) {
      const rid = r.id as string;
      const roundPoints = calculateRoundPoints(
        r,
        partsByRound[rid] ?? [],
        callsByRound[rid] ?? [],
        bonusByRound[rid] ?? []
      );

      for (const [memberId, pts] of Object.entries(roundPoints)) {
        if (scoreMap[memberId] === undefined) continue; // Safety
        scoreMap[memberId] += pts;
      }
    }

    // 9) Ergebnis im richtigen Format zurückgeben
    const playersWithResults = membersWithPlayerInfo.map((member) => ({
      player_id: member.playerId,
      member_id: member.memberId,
      player_name: member.playerName,
      seat_pos: member.seatPos,
      points: scoreMap[member.memberId as string] ?? 0,
    }));

    return ok({
      sessionResults: playersWithResults,
      message: "Session results calculated successfully.",
    });
  } catch (error) {
    console.error("Error fetching and calculating session results:", error);
    return serverError({
      message: "Database error while calculating session results.",
    });
  }
};
