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

// Typdefinitionen auf Basis des Drizzle-Schemas

type RoundRow = typeof round.$inferSelect;
type ParticipationRow = typeof roundParticipation.$inferSelect;
type CallRow = typeof roundCall.$inferSelect;
type BonusRow = typeof roundBonus.$inferSelect;

// Sonderpunkte-Konfiguration (TSR 7.2.3)
// Erfasst werden hier nur die im Regelwerk relevanten Sonderpunkte:
//  - DOKO: Doppelkopf (Stich mit mindestens 40 Augen)
//  - FUCHS: Karo-Ass (Fuchs) gefangen
//  - KARLCHEN: Kreuz-Bube macht den letzten Stich
// Alle anderen Bonus-Typen werden zwar aus der DB geladen, fließen aber
// nicht in die Berechnung ein (siehe Fallback weiter unten).

const BONUS_POINTS: Record<string, number> = {
  DOKO: 1,
  FUCHS: 1,
  KARLCHEN: 1,
};

// Hilfsfunktion: Klassifikation, ob ein Call eine Absage im Sinne von 7.1 / 7.2.2(c),(d) ist
const isAbsage = (c: CallRow["call"]) =>
  c === "KEINE90" || c === "KEINE60" || c === "KEINE30" || c === "SCHWARZ";

/**
 * Rundenbewertung nach TSR 7.1–7.2.4.
 * Annahmen:
 *  round.eyesRe enthält immer die Augen der Re-Partei
 *    (die UI-Eingabe wurde zuvor auf Re normalisiert, egal ob RE- oder KONTRA-Augen
 *     eingegeben wurden).
 *  Die Gesamtsumme der Augen beträgt 240 (Standard-Doppelkopf-Regel).
 * Berechnungsschritte:
 *  1. Zuordnung SessionMember → Partei (RE / KONTRA)
 *  2. Ermittlung von Absage-Erfolg/-Misserfolg (7.1.3)
 *  3. Bestimmung der Siegerpartei gemäß 7.1.1 / 7.1.2 / 7.1.3
 *  4. Parteibezogene Plus-Minus-Wertung nach 7.2.2 (a–f)
 *  5. Verteilung der Parteipunkte auf Spieler je nach Spieltyp (Normalspeil / Solo, 7.2.4)
 *  6. Addition der Sonderpunkte (7.2.3) spielerbezogen
 * Rückgabe:
 *  - Objekt: memberId → Punkte in dieser Runde.
 */
 export function calculateRoundPoints(
  roundRow: RoundRow,
  participations: ParticipationRow[],
  calls: CallRow[],
  bonuses: BonusRow[]
): Record<string, number> {
  // Augen der Re- und Kontra-Partei
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

  
  // Absageerfolg / misserfolg (TSR 7.1.3 und 7.2.2(c),(d))
  // Eine Absage ("keine 90/60/30" oder "schwarz") gilt als verfehlt, wenn
  // die gegnerische Partei mehr Augen macht als durch die Absage erlaubt.

  const absageFailed = (side: "RE" | "KONTRA"): boolean => {
    const oppEyes = side === "RE" ? eyesKontra : eyesRe;
    const callsSide = partyCalls[side];

    const has = (t: CallRow["call"]) => callsSide.includes(t);

    if (has("KEINE90") && oppEyes > 89) return true;
    if (has("KEINE60") && oppEyes > 59) return true;
    if (has("KEINE30") && oppEyes > 29) return true;
    if (has("SCHWARZ") && oppEyes !== 0) return true;

    return false;
  };

  const reFailedAbsage = absageFailed("RE");
  const kontraFailedAbsage = absageFailed("KONTRA");
  const bothFailedAbsage = reFailedAbsage && kontraFailedAbsage;

  // Spielerbezogene Punktemap (Ergebnis dieser Funktion)
  const points: Record<string, number> = {};

  
  // Gewinnerbestimmung (TSR 7.1.1 / 7.1.2 / 7.1.3)
  // Reihenfolge:
  //   1. Genau eine Partei verfehlt eine Absage:
  //        andere Partei gilt als Gewinnerin (entspricht Fällen 7.1.1/5–8
  //          und 7.1.2/5–8, wird aber abstrakt über Absage-Fehler abgebildet).

  //   2. Andernfalls entscheidet die höhere Augenzahl (Standardfall ohne
  //      Spezialkonstellationen).
  
  //   3. Bei Gleichstand (insbesondere 120 : 120):
  //        Re gewinnt, wenn ausschließlich "Kontra" angesagt wurde
  //          (keine Re-Ansage, keine Absagen) → 7.1.1 Nr. 4.
  //        In allen übrigen Gleichstands-Fällen gewinnt Kontra
  //          in 7.1.2 Nr. 1–3.

  const determineWinnerSide = (): "RE" | "KONTRA" => {
    // Fall 1: Eine Seite verfehlt eine Absage, die andere nicht
    if (reFailedAbsage && !kontraFailedAbsage) return "KONTRA";
    if (!reFailedAbsage && kontraFailedAbsage) return "RE";

    // Fall 2: Keine Seite (oder beide) verfehlen eine Absage → Augenvergleich
    if (eyesRe > eyesKontra) return "RE";
    if (eyesKontra > eyesRe) return "KONTRA";

    // Fall 3: Gleichstand bei den Augen (z.B 120 : 120)
    const reCalls = partyCalls.RE;
    const kontraCalls = partyCalls.KONTRA;

    const hasReAnsage = reCalls.includes("RE");
    const hasKontraAnsage = kontraCalls.includes("KONTRA");
    const anyAbsage =
      reCalls.some(isAbsage) || kontraCalls.some(isAbsage);

    // "nur Kontra" angesagt, keinerlei Re-Ansage, keinerlei Absagen
    const onlyKontraAnsage =
      hasKontraAnsage && !hasReAnsage && !anyAbsage;

    if (onlyKontraAnsage) {
      // Re gewinnt mit 120 Augen, wenn ausschließlich "Kontra" angesagt wurde.
      return "RE";
    }

    // Alle übrigen Gleichstands-Fälle: Kontra gewinnt gemäß 7.1.2 Nr. 1–3.
    return "KONTRA";
  };

  const winnerSide: "RE" | "KONTRA" = determineWinnerSide();
  const loserSide: "RE" | "KONTRA" = winnerSide === "RE" ? "KONTRA" : "RE";
  const loserEyes = loserSide === "RE" ? eyesRe : eyesKontra;

  // Parteibezogene Punkte nach 7.2.2 (Plus-Minus-Wertung)
  // Es wird zunächst parteiweise gerechnet (RE / KONTRA), danach erfolgt
  // in einem zweiten Schritt die Verteilung auf die einzelnen Spieler.

  type PartyPoints = { RE: number; KONTRA: number };
  const partyPoints: PartyPoints = { RE: 0, KONTRA: 0 };

  // Symmetrische Addition: jede Änderung für eine Partei wirkt entgegengesetzt
  // für die Gegenpartei (Plus-Minus-Wertung, Quersumme der Punkte bleibt 0).
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
  //
  // Die Verliererpartei erhält den negativen Gegenwert.
  

  let baseStufen = 1;

  if (loserEyes <= 89) baseStufen += 1;
  if (loserEyes <= 59) baseStufen += 1;
  if (loserEyes <= 29) baseStufen += 1;
  if (loserEyes === 0) baseStufen += 1;

  addParty(winnerSide, baseStufen);

  
  // Re-/Kontra-Ansagen und Absagen (TSR 7.2.2(b–d))
  //
  // - Ansagen "Re" / "Kontra" → jeweils ±2 Punkte (abhängig vom Spielsieg).
  // - Absagen "keine 90/60/30/schwarz" → jeweils ±1 Punkt, abhängig davon,
  //   ob die Bedingung erfüllt wurde.
  //
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
    for (const c of calls) {
      const memberId = c.memberId as string;
      const side = sideByMember[memberId];
      if (!side) continue;

      const oppEyes = side === "RE" ? eyesKontra : eyesRe;

      let value = 0;
      let success = false;

      switch (c.call) {
        case "RE":
        case "KONTRA":
          // Re-/Kontra-Ansage (7.2.2(b))
          value = 2;
          success = winnerSide === side;
          break;

        case "KEINE90":
        case "KEINE60":
        case "KEINE30":
        case "SCHWARZ": {
          // Absagen (7.2.2(c),(d))
          value = 1;
          const limit = absageThresholds[c.call]!;
          success = oppEyes <= limit;
          break;
        }
      }

      if (value !== 0) {
        const delta = success ? value : -value;
        addParty(side, delta);
      }
    }
  }

  
  // Punkte "Augen gegen Absage" (TSR 7.2.2(e),(f))
  //
  // Für die Partei, die gegen eine gegnerische Absage eine bestimmte Augenzahl
  // erreicht, wird je erfüllter Bedingung 1 Zusatzpunkt vergeben:
  //   120 Augen gegen "keine 90"
  //    90 Augen gegen "keine 60"
  //    60 Augen gegen "keine 30"
  //    30 Augen gegen "schwarz"
  //
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

    if (oppCalls.includes("KEINE90") && ownEyes >= gegenAbsageThresholds.KEINE90) extra += 1;
    if (oppCalls.includes("KEINE60") && ownEyes >= gegenAbsageThresholds.KEINE60) extra += 1;
    if (oppCalls.includes("KEINE30") && ownEyes >= gegenAbsageThresholds.KEINE30) extra += 1;
    if (oppCalls.includes("SCHWARZ") && ownEyes >= gegenAbsageThresholds.SCHWARZ) extra += 1;

    if (extra !== 0) addParty(side, extra);
  });

  
  // Verteilung der Parteipunkte auf Spieler (Normalspeil vs. Solo, TSR 7.2.4)
  //
  // - Normales Spiel / offene Hochzeit:
  //     alle Spieler einer Partei erhalten die gleiche Parteipunktzahl.
  //
  // - Solo / stille Hochzeit:
  //     die nach 7.2.2 ermittelte Parteipunktzahl wird
  //        * für den Solospieler verdreifacht,
  //        * für die Gegenspieler einfach mit umgekehrtem Vorzeichen
  //          angeschrieben (insgesamt 3 Gegner).
  

  const isSoloGame =
    roundRow.gameType === "SOLO_FARBE" ||
    roundRow.gameType === "SOLO_DAMEN" ||
    roundRow.gameType === "SOLO_BUBEN" ||
    roundRow.gameType === "SOLO_NULL"  ||
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
  // Alle nicht in BONUS_POINTS hinterlegten Bonus-Typen werden ignoriert.

  for (const b of bonuses) {
    const memberId = b.memberId as string;
    const bonusType = b.bonus as string;
    const value = BONUS_POINTS[bonusType] ?? 0;
    points[memberId] = (points[memberId] ?? 0) + value;
  }

  return points;
}


// GET /api/group/:group/session/:session/result
//
// Aggregation der Rundenwerte zu einem Sessionergebnis für alle Teilnehmer.


export const GET: RequestHandler = async ({ params }) => {
  const groupId = params.group;
  const sessionId = params.session;

  // Grundlegende Parameterprüfung (UUID-Validierung)
  if (!groupId || !UUID.safeParse(groupId).success) {
    return badRequest({ message: "Invalid or missing group ID" });
  }
  if (!sessionId || !UUID.safeParse(sessionId).success) {
    return badRequest({ message: "Invalid or missing session ID" });
  }

  try {
    // Prüfung: Session gehört zur angegebenen Gruppe
    const [sessionRow] = await db
      .select()
      .from(session)
      .where(and(eq(session.id, sessionId), eq(session.groupId, groupId)));

    if (!sessionRow) {
      return badRequest({ message: "Session not found for this group" });
    }

    // Session-Mitglieder inkl. Player-Infos (für Ausgabe benötigt)
    const membersWithPlayerInfo = await db
      .select({
        playerId: player.id,
        playerName: player.name,
        memberId: sessionMember.memberId,
        seatPos: sessionMember.seatPos,
      })
      .from(sessionMember)
      .innerJoin(playgroupMember, eq(playgroupMember.id, sessionMember.memberId))
      .innerJoin(player, eq(player.id, playgroupMember.playerId))
      .where(eq(sessionMember.sessionId, sessionId));

    // Runden der Session laden
    const rounds = await db
      .select()
      .from(round)
      .where(eq(round.sessionId, sessionId));

    // Falls noch keine Runde gespielt wurde, erhalten alle 0 Punkte
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

    // Beteiligungen, Calls und Boni zu allen Runden in einem Durchlauf laden
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

    // Gruppierung der Daten nach roundId für die Rundenauswertung
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

    // Scoreboard initialisieren (Member → Gesamtpunkte)
    const scoreMap: Record<string, number> = {};
    for (const m of membersWithPlayerInfo) {
      scoreMap[m.memberId as string] = 0;
    }

    // Rundenweise Auswertung und Aufsummierung
    for (const r of rounds) {
      const rid = r.id as string;
      const roundPoints = calculateRoundPoints(
        r,
        partsByRound[rid] ?? [],
        callsByRound[rid] ?? [],
        bonusByRound[rid] ?? []
      );

      for (const [memberId, pts] of Object.entries(roundPoints)) {
        if (scoreMap[memberId] === undefined) continue;
        scoreMap[memberId] += pts;
      }
    }

    // Zusammenstellung der Ergebnisstruktur für die API-Antwort
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
