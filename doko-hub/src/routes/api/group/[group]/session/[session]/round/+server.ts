import { badRequest, ok, serverError } from "$lib/http";
import { db } from "$lib/server/db";
import { round } from "$lib/server/db/schema";
import { GameType, Round, SoloKind, UUID } from "$lib/types";
import { readValidatedBody } from "$lib/validation";
import type { RequestHandler } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import z from "zod";

/**
 * 1. GET /api/group/[group]/session/[session]/round
 * Request: Keine
 * Response 200: [Round]
 * Response 400: { "message": string }
 * Response 500: { "message": string }
 * 
 * 2. POST /api/group/[group]/session/[session]/round
 * Request Body:
 * {
 * "roundNum": number,
 * "gameType": GameType,
 * "soloKind": SoloKind | null | undefined,
 * "eyesRe": number
 * }
 * Response 200: { "message": string, round: Round }
 * Response 400: { "message": string }
 * Response 500: { "message": string }
 */

/**
 * Ruft alle Runden ab die zu einer bestimmten Session gehören.
 * @param params URL-Parameter
 * @param fetch SvelteKit fetch-Funktion
 * @returns Response
 */
export const GET: RequestHandler = async({ params, fetch }) => {
    try {
        const groupId = params.group;
        const sessionId = params.session;
    
    if (!groupId || !(UUID.safeParse(groupId)).success) {
       return badRequest({ message: 'PlayGroup ID required' });
    }

    if (!sessionId || !UUID.safeParse(sessionId).success) {
      return badRequest({ message: "Session ID required" });
    }

    // Prüfen ob Gruppe existiert
    const groupResponse = await fetch(`/api/group/${groupId}`);
    if (groupResponse.status != 200) {
        return badRequest({ message: 'PlayGroup not found' });
    }

    // Prüfen ob Session existiert
    const sessionResponse = await fetch(`/api/group/${groupId}/session/${sessionId}`);
    if (sessionResponse.status != 200) {
        return badRequest({ message: 'Session not found' });
    }

    // Runden aus DB abrufen
    const roundsFromDB = await db
        .select()
        .from(round)
        .where(eq(round.sessionId, sessionId));
      
      return ok(roundsFromDB as Round[]);
    } catch(error) {
        return serverError({ message: 'Database error while fetching Round[]' });
    }
};

// Hilfsfunktion zur Normalisierung der Augen auf RE
//  - Für eine konsistente Auswertung wird hier auf RE-Augen normalisiert:
//      Wenn RE-Augen angegeben wurden: Wert wird direkt übernommen.
//      Wenn KONTRA-Augen angegeben wurden: wird auf RE umgerechnet: 240 - contraEyes.
function normalizeEyesToRe(
  enteredEyes: number,
  sideEntered: "RE" | "KONTRA"
): number {
  if (enteredEyes < 0 || enteredEyes > 240) {
    throw new Error("Eyes must be between 0 and 240");
  }

  if (sideEntered === "RE") {
    return enteredEyes;
  }

  // KONTRA-Augen werden auf RE-Augen abgebildet
  return 240 - enteredEyes;
}

/**
 * Erstellt eine neue Runde für die Session
 * @param event Event, enthält den Body zur validierung
 * @returns Response
 */
export const POST: RequestHandler = async (event) => {

  const bodySchema = z
    .object({
      roundNum: z.number().int().min(1),
      gameType: GameType,
      soloKind: SoloKind.optional().nullable(),
      eyes: z.number().int().min(0).max(240).optional(),
      eyesSide: z.enum(["RE", "KONTRA"]).optional(),
      eyesRe: z.number().int().min(0).max(240).optional(),
    })
    .refine(
      (data) =>
        (data.eyes !== undefined && data.eyesSide !== undefined) ||
        data.eyesRe !== undefined,
      {
        message:
          "Either (eyes + eyesSide) or eyesRe must be provided in the request body.",
        path: ["eyes"],
      }
    )
  .refine(
  (d) =>
    d.gameType.startsWith("SOLO_")
      ? d.soloKind != null
      : d.soloKind == null,
  {
    message: "Bei SOLO muss soloKind gesetzt sein, sonst muss es leer sein",
    path: ["soloKind"],
  }
);

  const { roundNum, gameType, soloKind, eyes, eyesSide, eyesRe } =
    await readValidatedBody(event, bodySchema);

  try {
    const groupId = event.params.group;
    const sessionId = event.params.session;

    if (!groupId || !UUID.safeParse(groupId).success) {
      return badRequest({ message: "PlayGroup ID required" });
    }

    if (!sessionId || !UUID.safeParse(sessionId).success) {
      return badRequest({ message: "Session ID required" });
    }

    // Prüfen ob Gruppe existiert
    const groupResponse = await event.fetch(`/api/group/${groupId}`);
    if (groupResponse.status != 200) {
      return badRequest({ message: "PlayGroup not found" });
    }

    // Prüfen ob Session existiert
    const sessionResponse = await event.fetch(
      `/api/group/${groupId}/session/${sessionId}`
    );
    if (sessionResponse.status != 200) {
      return badRequest({ message: "Session not found" });
    }

    // Normalisierung:
    //  wenn eyes + eyesSide vorhanden neue UI: auf RE-Augen umrechnen
    //  sonst, wenn eyesRe vorhanden  alte Variante direkt übernehmen

    let eyesReValue: number;

    if (eyes !== undefined && eyesSide !== undefined) {
      eyesReValue = normalizeEyesToRe(eyes, eyesSide);
    } else if (eyesRe !== undefined) {
      eyesReValue = eyesRe;
    } else {
      return badRequest({
        message: "No valid eyes data provided.",
      });
    }

    // Runden in DB erstellen
    const [roundFromDB] = await db
      .insert(round)
      .values({
        sessionId: sessionId,
        roundNum: roundNum,
        gameType: gameType,
        soloKind: soloKind,
        eyesRe: eyesReValue,
      })
      .returning();

    return ok({ message: "Created Round", round: roundFromDB });
  } catch (error) {
    return serverError({
      message: "Database error while creating Round",
      error,
    });
  }
};
