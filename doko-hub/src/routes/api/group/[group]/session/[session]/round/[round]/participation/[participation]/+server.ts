import { badRequest, serverError, ok } from "$lib/http";
import { db } from "$lib/server/db";
import { roundParticipation, sessionMember } from "$lib/server/db/schema";
import { RoundParticipation, UUID } from "$lib/types";
import {
  groupExists,
  isSessionMember,
  roundExists,
  sessionExists,
} from "$lib/utils";
import type { RequestHandler } from "@sveltejs/kit";
import { and, eq } from "drizzle-orm";

/**
 * 1. GET /api/group/[group]/session/[session]/round/[round]/participation/[participation]
 * Request: Keine
 * Response 200: RoundParticipation
 * Response 400: { "message": string }
 * Response 500: { "message": string }
 *
 * 2. PUT /api/group/[group]/session/[session]/round/[round]/participation/[participation]
 * Request Body:
 * {
 * "roundParticipation": RoundParticipation
 * }
 * Response 200: { "message": string, roundParticipation: RoundParticipation }
 * Response 400: { "message": string }
 * Response 500: { "message": string }
 */

/**
 * Ruft die Participation eines bestimmten Mitglieds an einer Runde ab
 * @param params Die URL-Parameter (groupID, sessionID, roundID, memberID).
 * @param fetch Die SvelteKit fetch-Funktion für interne API-Aufrufe zur Validierung.
 * @returns Response
 */
export const GET: RequestHandler = async ({ params, fetch }) => {
  try {
    const groupId = params.group;
    const sessionId = params.session;
    const roundId = params.round;
    const memberId = params.participation;

    if (!groupId || !UUID.safeParse(groupId).success) {
      return badRequest({ message: "PlayGroup ID required" });
    }

    if (!sessionId || !UUID.safeParse(sessionId).success) {
      return badRequest({ message: "Session ID required" });
    }

    if (!roundId || !UUID.safeParse(roundId).success) {
      return badRequest({ message: "Round ID required" });
    }

    if (!memberId || !UUID.safeParse(memberId).success) {
      return badRequest({ message: "Player ID required" });
    }

    // Prüfen ob Gruppe existiert
    const groupResponse = await fetch(`/api/group/${groupId}`);
    if (groupResponse.status != 200) {
      return badRequest({ message: "PlayGroup not found" });
    }

    // Prüfen ob Session existiert
    const sessionResponse = await fetch(
      `/api/group/${groupId}/session/${sessionId}`
    );
    if (sessionResponse.status != 200) {
      return badRequest({ message: "Session not found" });
    }

    // Prüfen ob Runde existiert
    const roundResponse = await fetch(
      `/api/group/${groupId}/session/${sessionId}/round/${roundId}`
    );
    if (roundResponse.status != 200) {
      return badRequest({ message: "Round not found" });
    }

    // Prüfen ob Sessionmember existiert
    if (!isSessionMember(sessionId, memberId)) {
      return badRequest({ message: "SessionMember not found" });
    }

    // Participation abrufen
    const [participation] = await db
      .select()
      .from(roundParticipation)
      .where(
        and(
          eq(roundParticipation.roundId, roundId),
          eq(roundParticipation.memberId, memberId)
        )
      );

    if (!participation) {
      return badRequest({ message: "RoundParticipation not found" });
    }

    return ok(participation as RoundParticipation);
  } catch (error) {
    return serverError({
      message: "Database error while fetching RoundParticipation",
    });
  }
};

/**
 * Aktualisiert die Participation eines Mitglieds an einer Runde
 * @param request Das Objekt für den Zugriff auf den Body
 * @param params URL-Parameter
 * @returns Response
 */
export const PUT: RequestHandler = async ({ params, request }) => {
  try {
    const groupId = params.group;
    const sessionId = params.session;
    const roundId = params.round;
    const memberId = params.participation;

    if (!groupId || !UUID.safeParse(groupId).success) {
      return badRequest({ message: "PlayGroup ID required" });
    }

    if (!sessionId || !UUID.safeParse(sessionId).success) {
      return badRequest({ message: "Session ID required" });
    }

    if (!roundId || !UUID.safeParse(roundId).success) {
      return badRequest({ message: "Round ID required" });
    }

    if (!memberId || !UUID.safeParse(memberId).success) {
      return badRequest({ message: "Member ID required" });
    }

    // Prüfen ob Gruppe existiert
    if (!groupExists(groupId)) {
      return badRequest({ message: "PlayGroup not found" });
    }

    // Prüfen ob Session existiert
    if (!sessionExists(sessionId)) {
      return badRequest({ message: "Session not found" });
    }

    // Prüfen ob Runde existiert
    if (!roundExists(roundId)) {
      return badRequest({ message: "Round not found" });
    }

    // Request Body validieren
    const body = await request.json();
    const newParticipation = body.roundParticipation;

    if (
      !newParticipation ||
      !RoundParticipation.safeParse(newParticipation).success
    ) {
      return badRequest({ message: "Valid RoundParticipation required" });
    }
    // Datenbank update
    const [updatedParticipation] = await db
      .update(roundParticipation)
      .set({
        side: newParticipation.side,
      })
      .where(
        and(
          eq(roundParticipation.roundId, roundId),
          eq(roundParticipation.memberId, memberId)
        )
      )
      .returning();

    if (
      !updatedParticipation ||
      !RoundParticipation.safeParse(updatedParticipation).success
    ) {
      return badRequest({ message: "RoundParticipation not found" });
    }
    return ok({
      message: "Updated RoundParticipation",
      roundParticipation: RoundParticipation.parse(updatedParticipation),
    });
  } catch (error) {
    return badRequest({
      message: "Database error while updating RoundParticipation",
    });
  }
};
