import { badRequest, created, ok, serverError } from "$lib/http";
import { db } from "$lib/server/db";
import { player } from "$lib/server/db/schema";
import { Name, type Player } from "$lib/types";
import type { RequestHandler } from "@sveltejs/kit";

import { z } from "zod";

/**
 * Schnittstelle die alle Spieler zurueckgibt
 * 
 * @returns Response
 */
export const GET: RequestHandler = async () => {
  try {
    // Alle Spieler aus der DB abfragen
    const playersFromDB = await db.select().from(player);

    // Liste zurueckgeben
    return ok(playersFromDB as Player[])
  } catch (error) {
    return serverError({ message: 'Database error while fetching Player[]' });
  }
};

/**
 * Speichert neuen Spieler in der DB
 * 
 * @param request 
 * @returns Response
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    // Request body
    const body = await request.json();
    const name = body.name;

    const nameParse = Name.safeParse(name);
    if (!nameParse.success) {
      return badRequest({ message: 'Name required and must be a string' });
    }

    // Spieler in DB schreiben und erstelltes Objekt speichern
    const [insertedPlayer] = await db
      .insert(player)
      .values({ name }) // bewusst: originaler Name; kein Auto-Trim im Storage
      .returning();

    // CHANGED: keine Zod-Validierung der DB-Ausgabe, kein ZodError-Catch – wie bei den anderen
    // OK und Spieler zurueckgeben
    return created({ message: 'Created Player', player: insertedPlayer as Player });
  } catch (error) {
    // CHANGED: kein spezieller ZodError-Block – einheitliches Error-Handling
    return serverError({ message: 'Database error while creating Player' })
  }
}