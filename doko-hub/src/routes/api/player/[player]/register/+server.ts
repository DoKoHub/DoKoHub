import { BadResponse, ErrorResponse, POSTResponse } from "$lib/responses";
import { db } from "$lib/server/db";
import { playerIdentity } from "$lib/server/db/schema";
import type { PlayerIdentity } from "$lib/types";
import { validateEmail } from "$lib/utils";
import type { RequestHandler } from "@sveltejs/kit";

import { z } from "zod";
// CHANGED: Zod + gebrandete Schemas/Typer aus euren DTOs

import {
  UUID as UUIDSchema,          // unser gebrandetes UUID-Zod-Schema
  type UUID as UUIDBrand,      // der gebrandete Typ
  AuthProvider                 // unser Provider-Enum (Zod enum)
} from "$lib/types";

export const POST: RequestHandler = async ({ request, params, fetch }) => {
  try {
    // Player ID aus der URL
    const playerID = params.player;

    //Falls UUID leer ist 
    if (!playerID) {
      return new BadResponse("Player ID required");
    }

    // CHANGED: UUID-Brand korrekt herstellen (Fix für "Type 'string' is not assignable to brand<'UUID'>")
    const parsedPlayer = UUIDSchema.safeParse(playerID);
    if (!parsedPlayer.success) {
      return new BadResponse("Player ID required");
    }
    const playerUUID: UUIDBrand = parsedPlayer.data; // gebrandete UUID

    // TODO: rework (original)
    const identityResponse = await fetch(`/api/player/${playerUUID}/identity`); // CHANGED: gebrandete UUID verwenden
    if (identityResponse.status == 200) {
      return new BadResponse("Player already has an PlayerIdentity");
    }

    // Request body auslesen
    let data: unknown;
    try {
      data = await request.json();
    } catch {
      // CHANGED: robuster gegen invalides JSON
      return new BadResponse("Valid PlayerIdentity required");
    }

    // PlayerIdentity aus data sammeln
    const input: PlayerIdentity | undefined = (data as any)?.playerIdentity as PlayerIdentity;

    // Pruefen ob playerIdentiyt null ist 
    if (!input) {
      return new BadResponse("Valid PlayerIdentity required");
    }

    if (!input.subject || input.subject.trim().length === 0) {
      return new BadResponse("Subject required");
    }

    if (!input.provider || (typeof input.provider === "string" && input.provider.trim().length === 0)) {
      return new BadResponse("Provider required");
    }

    if (!input.email || !validateEmail(input.email)) {
      return new BadResponse("Valid formatted email required");
    }

    // CHANGED: zusätzliche Format-Checks mit  DTOs/Zod (gleiche Fehlermeldungen wie oben)
    if (!AuthProvider.safeParse(input.provider).success) {
      return new BadResponse("Provider required");
    }
    if (!z.string().email().safeParse(input.email).success) {
      return new BadResponse("Valid formatted email required");
    }

    // CHANGED: createdAt sicher koerzieren, ansonsten Default wie vorher
    let createdAt: Date = new Date();
    if (input.createdAt != null) {
      const parsedDate = z.coerce.date().safeParse(input.createdAt as unknown);
      createdAt = parsedDate.success ? parsedDate.data : new Date();
    }

    // playerId setzen und  jetzt mit gebrandeter UUID
    // CHANGED: hier lag der Typfehler (string → UUIDBrand)
    input.playerId = playerUUID;

    // Mapping v.1 (id wird von db erstellt) – unverändert, nur mit geprüften Werten
    const insertObj = {
      playerId: playerUUID,        // CHANGED: gebrandete UUID
      provider: input.provider,
      subject: input.subject,
      email: input.email,
      createdAt: createdAt         // CHANGED: koerziertes Date
    };

    // In db speichern 
    const [dbIdentity] = await db
      .insert(playerIdentity)
      .values(insertObj)
      .returning();

    // OK und PlayerIdentity Objekt zurueckgeben 
    return new POSTResponse("Linked Player to PlayerIdentity", {
      name: "playerIdentity",
      data: dbIdentity as PlayerIdentity
    });
  } catch (error) {
    // Falls die DB einen Fehler wirft 
    return new ErrorResponse("Database error while linking PlayerIdentity");
  }
};