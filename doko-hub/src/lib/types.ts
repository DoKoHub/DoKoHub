// Globale Interfaces basierend auf dem ER-Modell
import { z } from "zod";

/** UUID brand + Parser */
//rüft: Ist der Wert ein gültiger UUID-String?
export const UUID = z.string().uuid().brand<"UUID">();
export type UUID = z.infer<typeof UUID>;

export const Name = z.string().trim().min(1);
export type Name = z.infer<typeof Name>;

export const Token = z.string().trim().min(1).max(80);
export type Token = z.infer<typeof Token>;

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

export const SoloKind = z.enum(["CLUBS", "SPADES", "HEARTS", "DIAMONDS"]);
export type SoloKind = z.infer<typeof SoloKind>;

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
  "GEGEN_DIE_ALTEN" /*,
  "SCHWEINCHEN",
  "HYPERSCHWEIN",           Auskommentiert, weil die in der ER Modellierung nicht vorhanden sind.
  "DULLE_GEFANGEN",
  "FUCHS_GEFANGEN",
  "KARLCHEN_IM_LETZTEN",*/,
]);
export type BonusType = z.infer<typeof BonusType>;

export const PointsKind = z.enum(["EYES", "STAGE", "BONUS", "MULT"]);
export type PointsKind = z.infer<typeof PointsKind>;

export const PlayerStatus = z.enum(["ACTIVE", "LEFT"]);
export type PlayerStatus = z.infer<typeof PlayerStatus>;

// Scoring, Calls, Bonuses, Points

export const SessionStatus = z.enum(["FULL", "NOTFULL"]);
export type SessionStatus = z.infer<typeof SessionStatus>;

export const Player = z
  .object({
    id: UUID,
    name: Name,
    provider: AuthProvider,
    subject: NonEmpty.max(200),
    email: z.string().email().optional().nullable(),
    createdAt: ISODate.optional().nullable(),
  })
  .strict();
export type Player = z.infer<typeof Player>;

// Groups, Invites, Member

export const PlayGroupMember = z
  .object({
    id: UUID,
    groupId: UUID,
    playerId: UUID.nullable(),
    nickname: Name.optional().nullable(),
    status: PlayerStatus,
    leftAt: ISODate.optional().nullable(),
  })
  .strict();
export type PlayGroupMember = z.infer<typeof PlayGroupMember>;

export const PlayGroup = z
  .object({
    id: UUID,
    name: Name,
    createdOn: ISODate.optional().nullable(),
    lastPlayedOn: ISODate.optional().nullable(),
    members: PlayGroupMember.array(),
  })
  .strict();
export type PlayGroup = z.infer<typeof PlayGroup>;

export const GroupInvite = z
  .object({
    id: UUID,
    groupId: UUID,
    token: NonEmpty.max(80),
    expiresAt: ISODate.optional().nullable(),
    createdBy: UUID,
  })
  .strict();
export type GroupInvite = z.infer<typeof GroupInvite>;

//Sessions

export const SessionMember = z
  .object({
    sessionId: UUID,
    memberId: UUID,
    seatPos: SeatPos,
  })
  .strict();
//erstellt automatisch den TypeScript-Typ aus genau diesem Schema.
//Der Typ wird direkt aus dem Schema abgeleitet, es gibt keine doppelte Definition.
export type SessionMember = z.infer<typeof SessionMember>;

export const Session = z
  .object({
    id: UUID,
    groupId: UUID,
    ruleset: Ruleset.default("STANDARD"),
    plannedRounds: z.number().int().min(1),
    startedAt: ISODate.optional().nullable(),
    endedAt: ISODate.optional().nullable(),
    members: SessionMember.array(),
  })
  .refine((s) => !(s.endedAt && s.startedAt) || s.endedAt >= s.startedAt, {
    message: "endedAt muss ≥ startedAt sein",
    path: ["endedAt"],
  })
  .strict();
export type Session = z.infer<typeof Session>;

//Rounds & Participation

export const Round = z
  .object({
    id: UUID,
    sessionId: UUID,
    roundNum: z.number().int().min(1).optional().nullable(),
    gameType: GameType,
    soloKind: SoloKind.optional().nullable(),
    eyesRe: z.number().int(),
  })
  .refine(
    //Wenn es kein SOLO_FARBE-Spiel ist → alles gut
    // Wenn es ein SOLO_FARBE-Spiel ist → dann muss soloKind gesetzt sein
    (r) => r.gameType !== "SOLO_FARBE" || !!r.soloKind,
    { message: "soloKind ist erforderlich bei SOLO_FARBE", path: ["soloKind"] }
  )
  .refine(
    //Wenn es ein SOLO_FARBE-Spiel ist → alles gut
    //Wenn es kein SOLO_FARBE-Spiel ist → dann muss soloKind leer sein
    (r) => r.gameType === "SOLO_FARBE" || !r.soloKind,
    { message: "soloKind nur bei SOLO_FARBE erlaubt", path: ["soloKind"] }
  )
  .strict();
export type Round = z.infer<typeof Round>;

export const RoundParticipation = z
  .object({
    roundId: UUID,
    memberId: UUID,
    side: Side,
  })
  .strict();
export type RoundParticipation = z.infer<typeof RoundParticipation>;

// Scoring, Calls, Bonuses, Points

export const RoundCall = z
  .object({
    id: UUID,
    roundId: UUID,
    memberId: UUID,
    call: CallType,
  })
  .strict();
export type RoundCall = z.infer<typeof RoundCall>;

export const RoundBonus = z
  .object({
    id: UUID,
    roundId: UUID,
    memberId: UUID,
    bonus: BonusType,
  })
  .strict();
export type RoundBonus = z.infer<typeof RoundBonus>;
