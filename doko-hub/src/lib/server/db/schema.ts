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

export const memberstatus = pgEnum('memberstatus', [
	'ACTIVE',
	'LEFT'
]);

export const sessionstatus = pgEnum('sessionstatus', [
	'FULL',
	'NOTFULL'
]);

export const gameType = pgEnum('game_type', [
	'NORMAL',
	'HOCHZEIT',
	'SOLO_FARBE',
	'SOLO_DAMEN',
	'SOLO_BUBEN',
	'SOLO_NULL'
]);

export const soloKind = pgEnum('solo_kind', ['CLUBS', 'SPADES', 'HEARTS', 'DIAMONDS']);

export const side = pgEnum('side', ['RE', 'KONTRA']);

export const callType = pgEnum('call_type', ['RE', 'KONTRA', 'KEINE90', 'KEINE60', 'KEINE30', 'SCHWARZ']);

export const bonusType = pgEnum('bonus_type', ['DOKO', 'FUCHS', 'KARLCHEN', 'LAUFENDE', 'GEGEN_DIE_ALTEN']);


export const player = pgTable('player', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: varchar('name', { length: 35 }).notNull(),
	provider: authProvider('provider').notNull(),
	subject: varchar('subject', { length: 100 }).notNull(),
	email: varchar('email', { length: 255 }),
	createdAt: timestamp('created_at')
});

export const playgroup = pgTable('playgroup', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: varchar('name', { length: 35 }).notNull(),
	createdOn: date('created_on'),
	lastPlayedOn: date('last_played_on')
});

export const groupInvite = pgTable('group_invite', {
	id: uuid('id').primaryKey().defaultRandom(),
	groupId: uuid('group_id').references(() => playgroup.id).notNull(),
	token: varchar('token', { length: 64 }).notNull(),
	expiresAt: timestamp('expires_at'),
	createdBy: uuid('created_by').references(() => player.id)
})

export const playgroupMember = pgTable('playgroup_member', {
	id: uuid('id').primaryKey().defaultRandom(),
	groupId: uuid('group_id').references(() => playgroup.id).notNull(),
	playerId: uuid('player_id').references(() => player.id),
	nickname: varchar('nickname', { length: 35 }),
	status: memberstatus('status'),
	leftAt: timestamp('left_at')
})

export const session = pgTable('session', {
	id: uuid('id').primaryKey().defaultRandom(),
	groupId: uuid('group_id').references(() => playgroup.id).notNull(),
	ruleset: ruleset('ruleset').notNull(),
	plannedRounds: integer('planned_rounds').notNull(),
	startedAt: timestamp('started_at'),
	endedAt: timestamp('ended_at')
})

export const sessionMember = pgTable('session_member', {
	sessionId: uuid('session_id').references(() => session.id).notNull(),
	memberId: uuid('member_id').references(() => playgroupMember.id).notNull(),
	seatPos: integer('seat_pos')
}, (table) => {
	return {
		sessionMemberPk: primaryKey({
			name: 'session_member_pk',
			columns: [table.sessionId, table.memberId]
		})
	};
});

export const round = pgTable('round', {
	id: uuid('id').primaryKey().defaultRandom(),
	sessionId: uuid('session_id').references(() => session.id).notNull(),
	roundNum: integer('round_num'),
	gameType: gameType('game_type').notNull(),
	soloKind: soloKind('solo_kind'),
	eyesRe: integer('eyes_re').notNull()
});

export const roundParticipation = pgTable('round_participation', {
	roundId: uuid('round_id').references(() => round.id).notNull(),
	memberId: uuid('member_id').references(() => playgroupMember.id).notNull(),
	side: side('side').notNull()
}, (table) => {
	return {
		roundParticipationPk: primaryKey({
			name: 'round_participation_pk',
			columns: [table.roundId, table.memberId]
		})
	};
});

export const roundCall = pgTable('round_call', {
	id: uuid('id').primaryKey().defaultRandom(),
	roundId: uuid('round_id').references(() => round.id).notNull(),
	memberId: uuid('member_id').references(() => playgroupMember.id).notNull(),
	call: callType('call').notNull()
});

export const roundBonus = pgTable('round_bonus', {
	id: uuid('id').primaryKey().defaultRandom(),
	roundId: uuid('round_id').references(() => round.id).notNull(),
	memberId: uuid('member_id').references(() => playgroupMember.id).notNull(),
	bonus: bonusType('bonus').notNull()
});

