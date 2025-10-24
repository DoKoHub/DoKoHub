import { pgTable, uuid, varchar, date, text, timestamp, integer, pgEnum, primaryKey } from 'drizzle-orm/pg-core';

export const authProvider = pgEnum('auth_provider', [
    'GOOGLE',
    'APPLE',
    'META'
]);

export const ruleset = pgEnum('ruleset', [
    'STANDARD',
    'HAUSREGEL_FLEISCHLOS',
    'HAUSREGEL_KURZSPIEL',
    'HAUSREGEL_KEINE_PFLICHTSOLO'
]);

export const gameType = pgEnum('game_type', [
  'NORMAL',
  'HOCHZEIT',
  'SOLO_FARBE',
  'SOLO_DAMEN',
  'SOLO_BUBEN',
  'SOLO_NULL'
]);

export const soloColor = pgEnum('solo_color', ['CLUBS', 'SPADES', 'HEARTS', 'DIAMONDS']);

export const side = pgEnum('side', ['RE', 'KONTRA']);

export const callType = pgEnum('call_type', ['RE', 'KONTRA', 'KEINE90', 'KEINE60', 'KEINE30', 'SCHWARZ']);

export const bonusType = pgEnum('bonus_type', ['DOKO', 'FUCHS', 'KARLCHEN', 'LAUFENDE', 'GEGEN_DIE_ALTEN']);


export const player = pgTable('player', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 35 }).notNull()
});

export const playgroup = pgTable('playgroup', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: varchar('name', { length: 35 }).notNull(),
	createdOn: date('created_on').notNull(),
	lastPlayedOn: date('last_played_on'),
	note: text('note')
});

export const playerIdentity = pgTable('player_identity', {
    id: uuid('id').primaryKey().defaultRandom(),
    playerId: uuid('player_id').references(() => player.id).notNull(),
	provider: authProvider('provider').notNull(),
	subject: varchar('subject', { length: 100 }).notNull(),
	email: varchar('email', { length: 255}),
	createdAt: timestamp('created_at').notNull()
})

export const groupInvite = pgTable('group_invite', {
	id: uuid('id').primaryKey().defaultRandom(),
	groupId: uuid('group_id').references(() => playgroup.id).notNull(),
	token: varchar('token', { length: 64}).notNull(),
	expiresAt: timestamp('expires_at').notNull(),
	createdBy: uuid('created_by').references(() => player.id).notNull()
})

export const playgroupMember = pgTable('playgroup_member', {
	groupId: uuid('group_id').references(() => playgroup.id).notNull(),
	playerId: uuid('player_id').references(() => player.id).notNull(),
	nickname: varchar('nickname', { length: 35}),
	status: varchar('status', { length: 35}).notNull(),
	leftAt: timestamp('left_at')
}, 
(table) => {
    return {
        playgroupMemberId: primaryKey({ 
            name: 'playgroup_member_id',
            columns: [table.groupId, table.playerId] 
        }) 
    }
})

export const session = pgTable('session', {
	id: uuid('id').primaryKey().defaultRandom(),
	groupId: uuid('group_id').references(() => playgroup.id).notNull(),
	title: varchar('title', { length: 35}).notNull(),
	ruleset: ruleset('ruleset').notNull(),
	status: varchar('status', { length: 35}).notNull(),
	plannedRounds: integer('planned_rounds'),
	startedAt: timestamp('started_at').notNull(),
	endedAt: timestamp('ended_at')
})

export const sessionMember = pgTable('session_member', {
  sessionId: uuid('session_id').references(() => session.id).notNull(),
  playerId:  uuid('player_id').references(() => player.id).notNull(),
}, (table) => {
  return {
    sessionMemberPk: primaryKey({
      name: 'session_member_pk',
      columns: [table.sessionId, table.playerId]
    })
  };
});

export const round = pgTable('round', {
  id:        uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => session.id).notNull(),
  roundNum:  integer('round_num'),              
  gameType:  gameType('game_type').notNull(),
  soloColor: soloColor('solo_color')
});

export const roundParticipation = pgTable('round_participation', {
  roundId:  uuid('round_id').references(() => round.id).notNull(),
  playerId: uuid('player_id').references(() => player.id).notNull(),
  side:     side('side').notNull(),      // 'RE' | 'KONTRA'
  seatPos:  integer('seat_pos').notNull() // 1..4
}, (table) => {
  return {
    roundParticipationPk: primaryKey({
      name: 'round_participation_pk',
      columns: [table.roundId, table.playerId]
    })
  };
});

export const roundScore = pgTable('round_score', {
  roundId:  uuid('round_id').references(() => round.id).notNull(),
  playerId: uuid('player_id').references(() => player.id).notNull(),
  eyes:     integer('eyes').notNull().default(0)
}, (table) => {
  return {
    roundScorePk: primaryKey({
      name: 'round_score_pk',
      columns: [table.roundId, table.playerId]
    })
  };
});



