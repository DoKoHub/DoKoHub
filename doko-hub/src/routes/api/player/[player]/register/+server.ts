import { db } from "$lib/server/db";
import { playerIdentity } from "$lib/server/db/schema";
import { PlayerIdentity } from "$lib/types";
import type { RequestHandler } from "@sveltejs/kit";
import { UUID } from "$lib/types";
import { badRequest, created, serverError } from "$lib/http";

export const POST: RequestHandler = async ({ request, params, fetch }) => {
  try {
    // Player ID aus der URL
    const playerId = params.player;

    //Falls UUID leer ist 
    if (!playerId || !(UUID.safeParse(playerId).success)) {
      return badRequest({ message: 'Player ID required' });
    }

    const playerResponse = await fetch(`/api/player/${playerId}`); // CHANGED: gebrandete UUID verwenden
    if (playerResponse.status != 200) {
      return badRequest({ message: 'Player not found' });
    }

    // TODO: rework (original)
    const identityResponse = await fetch(`/api/player/${playerId}/identity`); // CHANGED: gebrandete UUID verwenden
    if (identityResponse.status == 200) {
      return badRequest({ message: 'Player already has an PlayerIdentity' })
    }

    // Request body auslesen
    const body = await request.json();
    const playerIdentityFromBody = body.playerIdentity;

    if (!playerIdentityFromBody || !(PlayerIdentity.safeParse(playerIdentityFromBody).success)) {
      return badRequest({ message: 'PlayerIdentity required' });
    }

    // In db speichern 
    const [dbIdentity] = await db
      .insert(playerIdentity)
      .values(playerIdentityFromBody)
      .returning();
    
    return created({ message: 'Linked Player to PlayerIdentity', playerIdentity: dbIdentity as PlayerIdentity });
  } catch (error) {
    // Falls die DB einen Fehler wirft
    return serverError({ message: 'Database error while linking PlayerIdentity' });
  }
};