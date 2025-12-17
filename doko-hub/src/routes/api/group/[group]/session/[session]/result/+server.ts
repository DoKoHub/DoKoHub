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

/**
 * 1. GET /api/group/[group]/session/[session]/result
 * Request: Keine
 * Response 200: [
 * {
 * round_id: string,
 * round_num: number,
 * player_id: string,
 * member_id: string,
 * player_name: string,
 * seat_pos: number,
 * points: number
 * },
 * // ... weitere Spieler
 * ]
 * Response 400: { "message": string }
 * Response 500: { "message": string }
 */

type RoundRow = typeof round.$inferSelect;
type ParticipationRow = typeof roundParticipation.$inferSelect;
type CallRow = typeof roundCall.$inferSelect;
type BonusRow = typeof roundBonus.$inferSelect;

//  - DOKO: Doppelkopf (Stich mit mindestens 40 Augen)
//  - FUCHS: Karo-Ass (Fuchs) gefangen
//  - KARLCHEN: Kreuz-Bube macht den letzten Stich

const BONUS_POINTS: Record<string, number> = {
  DOKO: 1,
  FUCHS: 1,
  KARLCHEN: 1,
};

const isAbsage = (c: CallRow["call"]) =>
  c === "KEINE90" || c === "KEINE60" || c === "KEINE30" || c === "SCHWARZ";

/**
 * Rundenbewertung nach TSR 7.1–7.2.4.
 * Annahmen:
 *  round.eyesRe enthält immer die Augen der Re-Partei
 *    (die UI-Eingabe wurde zuvor auf Re normalisiert, nur wenn  KONTRA-Augen
 *     eingegeben wurd).
 *  Die Gesamtsumme der Augen beträgt 240
 * Berechnungsschritte:
 *  1. Zuordnung SessionMember alo Partei (RE / KONTRA)
 *  2. Ermittlung von Absage-Erfolg/-Misserfolg (7.1.3)
 *  3. Bestimmung der Siegerpartei gemäß 7.1.1 / 7.1.2 / 7.1.3
 *  4. Parteibezogene Plus-Minus-Wertung nach 7.2.2 (a–f)
 *  5. Verteilung der Parteipunkte auf Spieler je nach Spieltyp (Normalspeil / Solo, 7.2.4)
 *  6. Addition der Sonderpunkte (7.2.3) spielerbezogen
 * Rückgabe:
 *  - Objekt: memberId also die Punkte in dieser Runde.
 */
export function _calculateRoundPoints(
  roundRow: RoundRow,
  participations: ParticipationRow[],
  calls: CallRow[],
  bonuses: BonusRow[]
): Record<string, number> {
  const eyesRe = roundRow.eyesRe ?? 0;
  const eyesKontra = 240 - eyesRe;

  // Zuordnung der Session-Mitglieder zu den Parteien (RE / KONTRA)

  const reMembers = participations
    .filter((p) => p.side === "RE")
    .map((p) => p.memberId as string);

  const kontraMembers = participations
    .filter((p) => p.side === "KONTRA")
    .map((p) => p.memberId as string);

  const sideByMember: Record<string, "RE" | "KONTRA"> = {};
  for (const id of reMembers) sideByMember[id] = "RE";
  for (const id of kontraMembers) sideByMember[id] = "KONTRA";

  // Parteibezogene Zusammenfassung aller Calls (Ansagen + Absagen)
  const partyCalls: Record<"RE" | "KONTRA", CallRow["call"][]> = {
    RE: [],
    KONTRA: [],
  };
  for (const c of calls) {
    const side = sideByMember[c.memberId as string];
    if (!side) continue;
    partyCalls[side].push(c.call);
  }

  //helper: stärkste Absage pro Partei
  const absageRank = (call: CallRow["call"]) => {
    if (call === "SCHWARZ") return 4;
    if (call === "KEINE30") return 3;
    if (call === "KEINE60") return 2;
    if (call === "KEINE90") return 1;
    return 0;
  };

  // Welche Absage-Stufe wurde von der Partei tatsächlich verfehlt?
  // 0 = keine verfehlt, 1=KEINE90, 2=KEINE60, 3=KEINE30, 4=SCHWARZ
  const failedLevel = (side: "RE" | "KONTRA") => {
    const oppEyes = side === "RE" ? eyesKontra : eyesRe;
    const callsSide = Array.from(new Set(partyCalls[side]));

    // Wichtig: Reihenfolge von streng nach weniger streng
    if (callsSide.includes("SCHWARZ") && oppEyes !== 0)
      return absageRank("SCHWARZ");
    if (callsSide.includes("KEINE30") && oppEyes > 29)
      return absageRank("KEINE30");
    if (callsSide.includes("KEINE60") && oppEyes > 59)
      return absageRank("KEINE60");
    if (callsSide.includes("KEINE90") && oppEyes > 89)
      return absageRank("KEINE90");
    return 0;
  };

  // Absageerfolg / misserfolg (TSR 7.1.3 und 7.2.2(c),(d))
  // Eine Absage ("keine 90/60/30" oder "schwarz") gilt als verfehlt, wenn
  // die gegen Partei mehr Augen macht als durch die Absage erlaubt.

  const reFailLevel = failedLevel("RE");
  const kontraFailLevel = failedLevel("KONTRA");

  const reFailedAbsage = reFailLevel > 0;
  const kontraFailedAbsage = kontraFailLevel > 0;
  const bothFailedAbsage = reFailedAbsage && kontraFailedAbsage;

  const points: Record<string, number> = {};

  // 7.1.3: Beide Parteien verfehlen ihre Absage -> keine "normalen" Gewinner-Punkte b–d.
  // Wir rechnen hier nur (a) + (e/f) und gehen dann zur Verteilung + Sonderpunkte.
  if (bothFailedAbsage) {
    // (a) nach Augenvergleich (praktische Umsetzung, damit Plus/Minus weiterhin definiert ist)
    const winnerByEyes: "RE" | "KONTRA" =
      eyesRe > eyesKontra ? "RE" : eyesKontra > eyesRe ? "KONTRA" : "KONTRA";
    const loserByEyes: "RE" | "KONTRA" =
      winnerByEyes === "RE" ? "KONTRA" : "RE";
    const loserEyesLocal = loserByEyes === "RE" ? eyesRe : eyesKontra;

    // PartyPoints init
    type PartyPoints = { RE: number; KONTRA: number };
    const partyPoints: PartyPoints = { RE: 0, KONTRA: 0 };

    const addParty = (side: "RE" | "KONTRA", value: number) => {
      const other: "RE" | "KONTRA" = side === "RE" ? "KONTRA" : "RE";
      partyPoints[side] += value;
      partyPoints[other] -= value;
    };

    // (a) Grundwert + Stufen
    let baseStufen = 1;
    if (loserEyesLocal <= 89) baseStufen += 1;
    if (loserEyesLocal <= 59) baseStufen += 1;
    if (loserEyesLocal <= 29) baseStufen += 1;
    if (loserEyesLocal === 0) baseStufen += 1;
    addParty(winnerByEyes, baseStufen);

    // (e/f) Augen-gegen-Absage
    const gegenAbsageThresholds = {
      KEINE90: 120,
      KEINE60: 90,
      KEINE30: 60,
      SCHWARZ: 30,
    } as const;

    (["RE", "KONTRA"] as const).forEach((side) => {
      const ownEyes = side === "RE" ? eyesRe : eyesKontra;
      const oppSide: "RE" | "KONTRA" = side === "RE" ? "KONTRA" : "RE";
      const oppCalls = partyCalls[oppSide];

      let extra = 0;
      if (
        oppCalls.includes("KEINE90") &&
        ownEyes >= gegenAbsageThresholds.KEINE90
      )
        extra += 1;
      if (
        oppCalls.includes("KEINE60") &&
        ownEyes >= gegenAbsageThresholds.KEINE60
      )
        extra += 1;
      if (
        oppCalls.includes("KEINE30") &&
        ownEyes >= gegenAbsageThresholds.KEINE30
      )
        extra += 1;
      if (
        oppCalls.includes("SCHWARZ") &&
        ownEyes >= gegenAbsageThresholds.SCHWARZ
      )
        extra += 1;

      if (extra !== 0) addParty(side, extra);
    });

    // Verteilung (Normalspiel vs Solo) + Sonderpunkte.
    // Wir benutzen direkt partyPoints für die Verteilung:

    const isSoloGame =
      roundRow.gameType === "SOLO_CLUBS" ||
      roundRow.gameType === "SOLO_SPADES" ||
      roundRow.gameType === "SOLO_HEARTS" ||
      roundRow.gameType === "SOLO_DIAMONDS" ||
      roundRow.gameType === "SOLO_DAMEN" ||
      roundRow.gameType === "SOLO_BUBEN" ||
      roundRow.gameType === "SOLO_ASSE" ||
      roundRow.gameType === "HOCHZEIT_STILL";

    if (!isSoloGame) {
      for (const id of reMembers)
        points[id] = (points[id] ?? 0) + partyPoints.RE;
      for (const id of kontraMembers)
        points[id] = (points[id] ?? 0) + partyPoints.KONTRA;
    } else {
      let soloSide: "RE" | "KONTRA" | null = null;
      let soloMembers: string[] = [];

      if (reMembers.length === 1 && kontraMembers.length === 3) {
        soloSide = "RE";
        soloMembers = reMembers;
      } else if (kontraMembers.length === 1 && reMembers.length === 3) {
        soloSide = "KONTRA";
        soloMembers = kontraMembers;
      }

      if (!soloSide) {
        for (const id of reMembers)
          points[id] = (points[id] ?? 0) + partyPoints.RE;
        for (const id of kontraMembers)
          points[id] = (points[id] ?? 0) + partyPoints.KONTRA;
      } else {
        const oppSide: "RE" | "KONTRA" = soloSide === "RE" ? "KONTRA" : "RE";
        const base = partyPoints[soloSide];

        for (const id of soloMembers) points[id] = (points[id] ?? 0) + base * 3;

        const oppMembers = oppSide === "RE" ? reMembers : kontraMembers;
        for (const id of oppMembers) points[id] = (points[id] ?? 0) - base;
      }
    }

    // Sonderpunkte: nur im Normalspiel
    if (!isSoloGame) {
      for (const b of bonuses) {
        const memberId = b.memberId as string;
        const bonusType = b.bonus as string;
        const value = BONUS_POINTS[bonusType] ?? 0;
        points[memberId] = (points[memberId] ?? 0) + value;
      }
    }

    return points;
  }

  // Gewinnerbestimmung (TSR 7.1.1 / 7.1.2 / 7.1.3)
  // Reihenfolge:
  //   1. Genau eine Partei verfehlt eine Absage:
  //        andere Partei gilt als Gewinnerin (entspricht Fällen 7.1.1/5–8
  //        und 7.1.2/5–8, wird aber abstrakt über Absage-Fehler abgebildet).
  //   2. Andernfalls entscheidet die höhere Augenzahl (Standardfall ohne
  //      Spezialkonstellationen).
  //   3. Bei Gleichstand (insbesondere 120 : 120):
  //        Re gewinnt, wenn ausschließlich "Kontra" angesagt wurde
  //          (keine Re-Ansage, keine Absagen) in 7.1.1 Nr. 4.
  //        In allen übrigen Gleichstands-Fällen gewinnt Kontra
  //          in 7.1.2 Nr. 1–3.

  const determineWinnerSide = (): "RE" | "KONTRA" => {
    // Fall 1: Eine Seite verfehlt eine Absage, die andere nicht
    if (reFailedAbsage && !kontraFailedAbsage) return "KONTRA";
    if (!reFailedAbsage && kontraFailedAbsage) return "RE";

    // Fall 2: Keine Seite (oder beide) verfehlen eine Absage also Augenvergleich
    if (eyesRe > eyesKontra) return "RE";
    if (eyesKontra > eyesRe) return "KONTRA";

    // Fall 3: Gleichstand bei den Augen (z.B 120 : 120)
    const reCalls = partyCalls.RE;
    const kontraCalls = partyCalls.KONTRA;

    const hasReAnsage = reCalls.includes("RE");
    const hasKontraAnsage = kontraCalls.includes("KONTRA");
    const anyAbsage = reCalls.some(isAbsage) || kontraCalls.some(isAbsage);

    // "nur Kontra" angesagt, kein Re-Ansage, kein Absagen
    const onlyKontraAnsage = hasKontraAnsage && !hasReAnsage && !anyAbsage;

    if (onlyKontraAnsage) {
      // Re gewinnt mit 120 Augen, wenn ausschließlich "Kontra" angesagt wurde.
      return "RE";
    }

    // Alle übrigen Gleichstands-Fälle: Kontra gewinnt nach 7.1.2 Nr. 1–3.
    return "KONTRA";
  };

  const winnerSide: "RE" | "KONTRA" = determineWinnerSide();
  // Sonderfall 120:120 + nur KONTRA-Ansage -> RE gewinnt, aber KONTRA-Ansage darf NICHT als +2/-2 gewertet werden

  const loserSide: "RE" | "KONTRA" = winnerSide === "RE" ? "KONTRA" : "RE";
  const loserEyes = loserSide === "RE" ? eyesRe : eyesKontra;

  // Parteibezogene Punkte nach 7.2.2 (Plus-Minus-Wertung)
  // Es wird zunächst parteiweise gerechnet (RE / KONTRA), danach erfolgt
  // in einem zweiten Schritt die Verteilung auf die einzelnen Spieler.

  type PartyPoints = { RE: number; KONTRA: number };
  const partyPoints: PartyPoints = { RE: 0, KONTRA: 0 };

  // Symmetrische Addition: jede Änderung für eine Partei wirkt entgegengesetzt
  // für die Gegenpartei (Plus-Minus-Wertung).
  const addParty = (side: "RE" | "KONTRA", value: number) => {
    const other: "RE" | "KONTRA" = side === "RE" ? "KONTRA" : "RE";
    partyPoints[side] += value;
    partyPoints[other] -= value;
  };

  // Grundwert + Stufen (TSR 7.2.2(a))
  // Siegerpartei:
  //   - 1 Punkt Grundwert für den Spielsieg
  //   - +1, falls die Verliererpartei weniger als 90 Augen erreicht ("keine 90")
  //   - +1, falls weniger als 60 Augen ("keine 60")
  //   - +1, falls weniger als 30 Augen ("keine 30")
  //   - +1, falls 0 Augen ("schwarz")
  // Die Verliererpartei erhält den negativen Gegenwert.

  let baseStufen = 1;

  if (loserEyes <= 89) baseStufen += 1;
  if (loserEyes <= 59) baseStufen += 1;
  if (loserEyes <= 29) baseStufen += 1;
  if (loserEyes === 0) baseStufen += 1;

  addParty(winnerSide, baseStufen);

  // Re-/Kontra-Ansagen und Absagen (TSR 7.2.2(b–d))
  // - Ansagen "Re" / "Kontra" → jeweils ±2 Punkte (abhängig vom Spielsieg).
  // - Absagen "keine 90/60/30/schwarz" → jeweils ±1 Punkt
  // Spezialfall 7.1.3:
  //   Wenn beide Parteien ihre Absage verfehlen, entfallen die Punkte aus
  //   7.2.2(b–d). Es bleiben nur Grundwert/Stufen (a) und Augen-gegen-Absage (e),(f)
  //   sowie Sonderpunkte (7.2.3).

  const absageThresholds: Record<CallRow["call"], number | undefined> = {
    KEINE90: 89,
    KEINE60: 59,
    KEINE30: 29,
    SCHWARZ: 0,
    RE: undefined,
    KONTRA: undefined,
  };

  if (!bothFailedAbsage) {
    const processedAbsagen: Record<"RE" | "KONTRA", Set<CallRow["call"]>> = {
      RE: new Set(),
      KONTRA: new Set(),
    };

    (["RE", "KONTRA"] as const).forEach((side) => {
      const oppEyes = side === "RE" ? eyesKontra : eyesRe;

      for (const call of partyCalls[side]) {
        let value = 0;
        let success = false;

        if (call === "RE" || call === "KONTRA") {
          value = 2;
          success = winnerSide === side;
        } else if (isAbsage(call)) {
          if (processedAbsagen[side].has(call)) {
            continue;
          }
          processedAbsagen[side].add(call);

          value = 1;
          const limit = absageThresholds[call]!;
          success = oppEyes <= limit;
        }

        if (value) addParty(side, success ? value : -value);
      }
    });
  }

  // Punkte "Augen gegen Absage" (TSR 7.2.2(e),(f))
  // Wenn eine Partei trotz einer Absage der anderen Seite genug Augen macht, bekommt sie für jede erfüllte Bedingung einen Zusatzpunkt
  //   120 Augen gegen "keine 90"
  //    90 Augen gegen "keine 60"
  //    60 Augen gegen "keine 30"
  //    30 Augen gegen "schwarz"
  // Diese Punkte werden auch im Fall 7.1.3 vergeben (beidseitig verfehlte Absage).

  const gegenAbsageThresholds = {
    KEINE90: 120,
    KEINE60: 90,
    KEINE30: 60,
    SCHWARZ: 30,
  } as const;

  (["RE", "KONTRA"] as const).forEach((side) => {
    const ownEyes = side === "RE" ? eyesRe : eyesKontra;
    const oppSide: "RE" | "KONTRA" = side === "RE" ? "KONTRA" : "RE";
    const oppCalls = partyCalls[oppSide];

    let extra = 0;

    if (
      oppCalls.includes("KEINE90") &&
      ownEyes >= gegenAbsageThresholds.KEINE90
    )
      extra += 1;
    if (
      oppCalls.includes("KEINE60") &&
      ownEyes >= gegenAbsageThresholds.KEINE60
    )
      extra += 1;
    if (
      oppCalls.includes("KEINE30") &&
      ownEyes >= gegenAbsageThresholds.KEINE30
    )
      extra += 1;
    if (
      oppCalls.includes("SCHWARZ") &&
      ownEyes >= gegenAbsageThresholds.SCHWARZ
    )
      extra += 1;

    if (extra !== 0) addParty(side, extra);
  });

  // Verteilung der Parteipunkte auf Spieler (Normalspeil vs. Solo, TSR 7.2.4)
  // - Normales Spiel / offene Hochzeit:
  //     alle Spieler einer Partei erhalten die gleiche Parteipunktzahl.
  // - Solo / stille Hochzeit:
  //     die nach 7.2.2 ermittelte Parteipunktzahl wird
  //        * für den Solospieler verdreifacht,
  //        * für die Gegenspieler einfach mit umgekehrtem Vorzeichen
  //          angeschrieben (insgesamt 3 Gegner).

  const isSoloGame =
    roundRow.gameType === "SOLO_CLUBS" ||
    roundRow.gameType === "SOLO_SPADES" ||
    roundRow.gameType === "SOLO_HEARTS" ||
    roundRow.gameType === "SOLO_DIAMONDS" ||
    roundRow.gameType === "SOLO_DAMEN" ||
    roundRow.gameType === "SOLO_BUBEN" ||
    roundRow.gameType === "SOLO_ASSE" ||
    roundRow.gameType === "HOCHZEIT_STILL"; // stille Hochzeit wird wie Solo behandelt

  if (!isSoloGame) {
    // Normalspiel / offene Hochzeit: klassische Plus-Minus-Wertung
    for (const id of reMembers) {
      points[id] = (points[id] ?? 0) + partyPoints.RE;
    }
    for (const id of kontraMembers) {
      points[id] = (points[id] ?? 0) + partyPoints.KONTRA;
    }
  } else {
    // Solo / stille Hochzeit (1 vs. 3 Spieler)
    let soloSide: "RE" | "KONTRA" | null = null;
    let soloMembers: string[] = [];

    if (reMembers.length === 1 && kontraMembers.length === 3) {
      soloSide = "RE";
      soloMembers = reMembers;
    } else if (kontraMembers.length === 1 && reMembers.length === 3) {
      soloSide = "KONTRA";
      soloMembers = kontraMembers;
    }

    if (!soloSide) {
      // Fallback, falls kein sauberes 1-gegen-3-Muster vorliegt:
      // es wird wie ein Normalspeil behandelt.
      for (const id of reMembers) {
        points[id] = (points[id] ?? 0) + partyPoints.RE;
      }
      for (const id of kontraMembers) {
        points[id] = (points[id] ?? 0) + partyPoints.KONTRA;
      }
    } else {
      const oppSide: "RE" | "KONTRA" = soloSide === "RE" ? "KONTRA" : "RE";
      const base = partyPoints[soloSide];

      // Solospieler: dreifache Parteipunktzahl (TSR 7.2.4)
      for (const id of soloMembers) {
        points[id] = (points[id] ?? 0) + base * 3;
      }

      // Gegenspieler: einfache Parteipunktzahl mit umgekehrtem Vorzeichen
      const oppMembers = oppSide === "RE" ? reMembers : kontraMembers;
      for (const id of oppMembers) {
        points[id] = (points[id] ?? 0) - base;
      }
    }
  }

  // Sonderpunkte je Spieler (TSR 7.2.3)
  // Jeder Eintrag in round_bonus repräsentiert einen Sonderpunkt-Ereignis.
  // Die genaue Art (DOKO, FUCHS, KARLCHEN) bestimmt die Punktzahl.
  // Sonderpunkte nur im Normalspiel
  if (!isSoloGame) {
    for (const b of bonuses) {
      const memberId = b.memberId as string;
      const bonusType = b.bonus as string;
      const value = BONUS_POINTS[bonusType] ?? 0;
      points[memberId] = (points[memberId] ?? 0) + value;
    }
  }

  return points;
}

/**
 * Aggregation der Rundenwerte zu einem Sessionergebnis für alle Teilnehmer
 * @param params URL-Parameter
 * @returns Response
 */
export const GET: RequestHandler = async ({ params }) => {
  const groupId = params.group;
  const sessionId = params.session;

  if (!groupId || !UUID.safeParse(groupId).success) {
    return badRequest({ message: "Invalid or missing group ID" });
  }
  if (!sessionId || !UUID.safeParse(sessionId).success) {
    return badRequest({ message: "Invalid or missing session ID" });
  }

  try {
    const [sessionRow] = await db
      .select()
      .from(session)
      .where(and(eq(session.id, sessionId), eq(session.groupId, groupId)));

    if (!sessionRow) {
      return badRequest({ message: "Session not found for this group" });
    }

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

    const rounds = await db
      .select()
      .from(round)
      .where(eq(round.sessionId, sessionId));

    if (rounds.length === 0) {
      return ok({ results: [] });
    }

    const roundIds = rounds.map((r) => r.id as string);

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

    const partsByRound: Record<string, ParticipationRow[]> = {};
    const callsByRound: Record<string, CallRow[]> = {};
    const bonusByRound: Record<string, BonusRow[]> = {};

    for (const p of participations) {
      (partsByRound[p.roundId as string] ??= []).push(p);
    }
    for (const c of calls) {
      (callsByRound[c.roundId as string] ??= []).push(c);
    }
    for (const b of bonuses) {
      (bonusByRound[b.roundId as string] ??= []).push(b);
    }

    const results: any[] = [];

    for (const r of rounds) {
      const rid = r.id as string;

      const roundPoints = _calculateRoundPoints(
        r,
        partsByRound[rid] ?? [],
        callsByRound[rid] ?? [],
        bonusByRound[rid] ?? []
      );

      for (const member of membersWithPlayerInfo) {
        results.push({
          round_id: rid,
          round_num: r.roundNum,
          player_id: member.playerId,
          member_id: member.memberId,
          player_name: member.playerName,
          seat_pos: member.seatPos,
          points: roundPoints[member.memberId as string] ?? 0,
        });
      }
    }

    return ok({ results, message: "Session results calculated successfully." });
  } catch (error) {
    return serverError({
      message: "Database error while calculating session results.",
    });
  }
};
