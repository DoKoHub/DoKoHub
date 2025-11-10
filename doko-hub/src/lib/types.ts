// Globale Interfaces basierend auf dem ER-Modell

import { z } from "zod";


/** UUID brand + Parser */
//rüft: Ist der Wert ein gültiger UUID-String?
export const UUID = z.string().uuid().brand<"UUID">();
export type UUID = z.infer<typeof UUID>;

/** Dates: erlauben String/Date → geben Date zurück */
export const ISODate = z.coerce.date();

/** Strings */
//entfernt überflüssige Leerzeichen und verhindert leere Strings wie
export const NonEmpty = z.string().trim().min(1);

/** Seat positions: 1..4  */
export const SeatPos = z.number().int().min(1).max(4);
export type SeatPos = z.infer<typeof SeatPos>;


export const GameType = z.enum([
  "NORMAL",
  "HOCHZEIT",
  "SOLO_FARBE",
  "SOLO_DAMEN",
  "SOLO_BUBEN",
  "SOLO_NULL",
]);
export type GameType = z.infer<typeof GameType>;

export const AuthProvider = z.enum(["GOOGLE", "APPLE", "META"]);
export type AuthProvider = z.infer<typeof AuthProvider>;

export const SoloColor = z.enum(["CLUBS", "SPADES", "HEARTS", "DIAMONDS"]);
export type SoloColor = z.infer<typeof SoloColor>;

export const Side = z.enum(["RE", "KONTRA"]);
export type Side = z.infer<typeof Side>;

export const Ruleset = z.enum([
  "STANDARD",
  "HAUSREGEL_FLEISCHLOS",
  "HAUSREGEL_KURZSPIEL",
  "HAUSREGEL_KEINE_PFLICHTSOLO",
]);
export type Ruleset = z.infer<typeof Ruleset>;

export const CallType = z.enum([
  "RE",
  "KONTRA",
  "KEINE90",
  "KEINE60",
  "KEINE30",
  "SCHWARZ",
]);
export type CallType = z.infer<typeof CallType>;

export const BonusType = z.enum([
  "DOKO",
  "FUCHS",
  "KARLCHEN",
  "LAUFENDE",
  "GEGEN_DIE_ALTEN"/*,
  "SCHWEINCHEN",
  "HYPERSCHWEIN",           Auskommentiert, weil die in der ER Modellierung nicht vorhanden sind.
  "DULLE_GEFANGEN",
  "FUCHS_GEFANGEN",
  "KARLCHEN_IM_LETZTEN",*/
]);
export type BonusType = z.infer<typeof BonusType>;

export const PointsKind = z.enum(["EYES", "STAGE", "BONUS", "MULT"]);
export type PointsKind = z.infer<typeof PointsKind>;

export const PlayerStatus = z.enum(["ACTIVE", "LEFT"]);
export type PlayerStatus = z.infer<typeof PlayerStatus>;


export const SessionStatus = z.enum(["FULL", "NOTFULL"]);
export type SessionStatus = z.infer<typeof SessionStatus>;

export const Player = z.object({
    id: UUID,
    name: NonEmpty.max(35),
  })
  .strict();
  export type Player= z.infer<typeof Player>;


export const PlayerIdentity = z.object({
    id: UUID,
    playerId: UUID,
    provider: AuthProvider,
    subject: NonEmpty.max(200),
    email: z.string().email().optional().nullable(),
    createdAt: ISODate.optional().nullable(),
  })
  .strict();
export type PlayerIdentity = z.infer<typeof PlayerIdentity>;

// Groups, Invites, Member
 
export const PlayGroup = z.object({
    id: UUID,
    name: NonEmpty.max(80),
    createdOn: ISODate.optional().nullable(),
    lastPlayedOn: ISODate.optional().nullable(),
    note: z.string().trim().max(500).optional().nullable(),
  })
  .strict();
export type PlayGroup = z.infer<typeof PlayGroup>;

export const GroupInvite = z.object({
    id: UUID,
    groupId: UUID,
    token: NonEmpty.max(80),
    expiresAt: ISODate.optional().nullable(),
    createdBy: ISODate.optional().nullable(), // ggf. userId
  })
  .strict();
export type GroupInvite = z.infer<typeof GroupInvite>;

export const PlayGroupMember = z.object({
    groupId: UUID,
    playerId: UUID,
    nickname: z.string().trim().max(60).optional().nullable(),
    status: PlayerStatus,
    leftAt: ISODate.optional().nullable(),
  })
  .strict();
export type PlayGroupMember = z.infer<typeof PlayGroupMember>;

//Sessions
 
export const Session = z.object({
    id: UUID,
    groupId: UUID,
    ruleset: Ruleset.default("STANDARD"),
    plannedRounds: z.number().int().min(1),
    startedAt: ISODate.optional().nullable(),
    endedAt: ISODate.optional().nullable(),
  })
  .refine(
    (s) => !(s.endedAt && s.startedAt) || s.endedAt >= s.startedAt,
    { message: "endedAt muss ≥ startedAt sein", path: ["endedAt"] }
  )
  .strict();
export type Session = z.infer<typeof Session>;

export const SessionMember = z.object({
    sessionId: UUID,
    playerId: UUID,
  })
  .strict();
  //erstellt automatisch den TypeScript-Typ aus genau diesem Schema.
  //Der Typ wird direkt aus dem Schema abgeleitet, es gibt keine doppelte Definition.
export type SessionMember = z.infer<typeof SessionMember>;

//Rounds & Participation
 
export const Round = z.object({
    id: UUID,
    sessionId: UUID,
    roundNum: z.number().int().min(1).optional().nullable(),
    gameType: GameType,
    soloColor: SoloColor.optional().nullable(),
  })
  .refine(
    //Wenn es kein SOLO_FARBE-Spiel ist → alles gut
   // Wenn es ein SOLO_FARBE-Spiel ist → dann muss soloColor gesetzt sein
    (r) => r.gameType !== "SOLO_FARBE" || !!r.soloColor,
    { message: "soloColor ist erforderlich bei SOLO_FARBE", path: ["soloColor"] }
  )
  .refine( 
    //Wenn es ein SOLO_FARBE-Spiel ist → alles gut
    //Wenn es kein SOLO_FARBE-Spiel ist → dann muss soloColor leer sein
    (r) => r.gameType === "SOLO_FARBE" || !r.soloColor,
    { message: "soloColor nur bei SOLO_FARBE erlaubt", path: ["soloColor"] }
  )
  .strict();
export type Round = z.infer<typeof Round>;


export const RoundParticipation = z.object({
    roundId: UUID,
    playerId: UUID,
    side: Side,
    seatPos: SeatPos.optional().nullable(),
  })
  .strict();
export type RoundParticipation = z.infer<typeof RoundParticipation>;


 // Scoring, Calls, Bonuses, Points
 
export const RoundScore = z.object({
    roundId: UUID,
    playerId: UUID,
    eyes: z.number().int().min(0).max(240),
  })
  .strict();
export type RoundScore = z.infer<typeof RoundScore>;

export const RoundCall = z.object({
    id: UUID,
    roundId: UUID,
    playerId: UUID,
    call: CallType,
  })
.strict();
export type RoundCall = z.infer<typeof RoundCall>;

export const RoundBonus = z.object({
    id: UUID,
    roundId: UUID,
    playerId: UUID,
    bonus: BonusType,
    count: z.number().int().min(0).max(10).default(0),
  })
  .strict();
export type RoundBonus = z.infer<typeof RoundBonus>;

export const RoundPoints = z.object({
    roundId: UUID,
    playerId: UUID,
    score: z.number().int(),
  })
  .strict();
export type RoundPoints = z.infer<typeof RoundPoints>;