import { badRequest, created, ok, serverError } from "$lib/http";
import { db } from "$lib/server/db";
import { player } from "$lib/server/db/schema";
import { AuthProvider, Name, NonEmpty, type Player } from "$lib/types";
import { readValidatedBody } from "$lib/validation";
import type { RequestHandler } from "@sveltejs/kit";
import z from "zod";

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
export const POST: RequestHandler = async (event) => {
  const bodySchema = z.object({
    name: Name,
    provider: AuthProvider,
    subject: NonEmpty.max(200),
    email: z.email()
  });
  const { name, provider, subject, email } = await readValidatedBody(event, bodySchema)

  try {

    // Spieler in DB schreiben und erstelltes Objekt speichern
    const [insertedPlayer] = await db
      .insert(player)
      .values({
        name: name,
        provider: provider,
        subject: subject,
        email: email,
        createdAt: new Date()
      })
      .returning();

    return created({ message: 'Created Player', player: insertedPlayer as Player });
  } catch (error) {
    console.log(error);
    return serverError({ message: 'Database error while creating Player' })
  }
}