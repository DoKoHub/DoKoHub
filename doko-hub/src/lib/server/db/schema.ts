import { pgTable, integer, uuid } from 'drizzle-orm/pg-core';

export const nummer = pgTable('nummer', {
	id: uuid('id')
		.primaryKey().defaultRandom(),
	wert: integer('wert')
});