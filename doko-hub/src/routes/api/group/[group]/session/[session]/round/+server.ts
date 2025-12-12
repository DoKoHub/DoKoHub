import { badRequest, ok, serverError } from "$lib/http";
import { db } from "$lib/server/db";
import { round } from "$lib/server/db/schema";
import { GameType, Round, SoloKind, UUID } from "$lib/types";
import { readValidatedBody } from "$lib/validation";
import type { RequestHandler } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import z from "zod";

export const GET: RequestHandler = async ({ params, fetch }) => {
  try {
    const groupId = params.group;
    const sessionId = params.session;

    if (!groupId || !UUID.safeParse(groupId).success) {
      return badRequest({ message: "PlayGroup ID required" });
    }

    if (!sessionId || !UUID.safeParse(sessionId).success) {
      return badRequest({ message: "Session ID required" });
    }

    const groupResponse = await fetch(`/api/group/${groupId}`);
    if (groupResponse.status != 200) {
      return badRequest({ message: "PlayGroup not found" });
    }

    const sessionResponse = await fetch(
      `/api/group/${groupId}/session/${sessionId}`
    );
    if (sessionResponse.status != 200) {
      return badRequest({ message: "Session not found" });
    }

    const roundsFromDB = await db
      .select()
      .from(round)
      .where(eq(round.sessionId, sessionId));

    return ok(roundsFromDB as Round[]);
  } catch (error) {
    return serverError({ message: "Database error while fetching Round[]" });
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

export const POST: RequestHandler = async (event) => {
  // Request-Body:
  //  neue (UI): eyes + eyesSide
  //  alt (Tests): eyesRe

  const bodySchema = z
    .object({
      roundNum: z.number().int().min(1),
      gameType: GameType,
      soloKind: SoloKind.optional().nullable(),

      // neues Format (für UI)
      eyes: z.number().int().min(0).max(240).optional(),
      eyesSide: z.enum(["RE", "KONTRA"]).optional(),

      // altes Format (für alte Tests / alten Code)
      eyesRe: z.number().int().min(0).max(240).optional(),
    })
    .refine(
      (data) =>
        // entweder neues format vollständig
        (data.eyes !== undefined && data.eyesSide !== undefined) ||
        // oder altes format
        data.eyesRe !== undefined,
      {
        message:
          "Either (eyes + eyesSide) or eyesRe must be provided in the request body.",
        path: ["eyes"],
      }
    );

  // wichtig: hier auch eyesRe mit auslesen
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

    const groupResponse = await event.fetch(`/api/group/${groupId}`);
    if (groupResponse.status != 200) {
      return badRequest({ message: "PlayGroup not found" });
    }

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

    const [roundFromDB] = await db
      .insert(round)
      .values({
        sessionId: sessionId,
        roundNum: roundNum,
        gameType: gameType,
        soloKind: soloKind,
        // immer RE-Augen in der Datenbank
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
