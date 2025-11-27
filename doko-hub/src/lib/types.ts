// Globale Interfaces basierend auf dem ER-Modell

export type UUID = string;

export type GameType =
  | 'NORMAL'
  | 'HOCHZEIT'
  | 'SOLO_FARBE'
  | 'SOLO_DAMEN'
  | 'SOLO_BUBEN'
  | 'SOLO_NULL';

export type AuthProvider = 'GOOGLE' | 'APPLE' | 'META';

export type SoloColor = 'CLUBS' | 'SPADES' | 'HEARTS' | 'DIAMONDS';

export type Side = 'RE' | 'KONTRA';

export type Ruleset =
  | 'STANDARD'
  | 'HAUSREGEL_FLEISCHLOS'
  | 'HAUSREGEL_KURZSPIEL'
  | 'HAUSREGEL_KEINE_PFLICHTSOLO';
  
  export type CallType =
  | 'RE'
  | 'KONTRA'
  | 'KEINE90'
  | 'KEINE60'
  | 'KEINE30'
  | 'SCHWARZ';

  export type BonusType =
  | 'DOKO'
  | 'FUCHS'
  | 'KARLCHEN'
  
  | 'LAUFENDE'
  | 'GEGEN_DIE_ALTEN'
  | 'SCHWEINCHEN'
  | 'HYPERSCHWEIN'
  | 'DULLE_GEFANGEN'
  | 'FUCHS_GEFANGEN'
  | 'KARLCHEN_IM_LETZTEN';

  export type PointsKind = 'EYES' | 'STAGE' | 'BONUS' | 'MULT';

  export type PlayerStatus = 'ACTIVE' | 'LEFT';

  export type SessionStatus = 'ACTIVE' | 'COMPLETED' | 'ABANDONED';

  export type SeatPos = 1 | 2 | 3 | 4;




export interface Player {
  id: UUID;
  name: string;
}


export interface PlayerIdentity {
  id: UUID;
  playerId: UUID;
  provider: AuthProvider;
  subject: string;
  email?: string | null;
  createdAt?: Date | null;
}


export interface PlayGroup {
  id: UUID;
  name: string;
  createdOn?: Date | null;
  lastPlayedOn?: Date | null;
  note?: string | null;
}


export interface GroupInvite {
  id: UUID;
  groupId: UUID;
  token: string;
  expiresAt?: Date | null;
  createdBy?: Date | null;
}


export interface PlayGroupMember {
  groupId: UUID;
  playerId: UUID;
  nickname?: string | null;
  status: PlayerStatus;
  leftAt?: Date | null;
}

export interface Session {
  id: UUID;
  groupId: UUID;                
  title?: string | null;
  ruleset: Ruleset;  // default 'STANDARD'
  status?: SessionStatus | null;
  plannedRounds: number;         
  startedAt?: Date | null;     
  endedAt?: Date | null;   
}

export interface SessionMember {
  sessionId: UUID;               
  playerId: UUID;                
}


export interface Round {
  id: UUID;
  sessionId: UUID;               
  roundNum?: number | null;      
  gameType: GameType;            
  soloColor?: SoloColor | null;  // nur bei SOLO_FARBE

}


export interface RoundParticipation {
  roundId: UUID;                 
  playerId: UUID;                
  side: Side;                    
  seatPos?: SeatPos | null ; 

}


export interface RoundScore {
  roundId: UUID;                 
  playerId: UUID;                
  eyes: number; // Summe aller Spieler = 240
}


export interface RoundCall {
  id: UUID;
  roundId: UUID;                 
  playerId: UUID;                
  call: CallType;
  
}


export interface RoundBonus {
  id: UUID;
  roundId: UUID;                 
  playerId: UUID;                
  bonus: BonusType;
  count: number;   
}               


export interface RoundPoints {
  roundId: UUID;                 
  playerId: UUID;            
  score: number; // Gewinner +X, Verlierer -X
}


