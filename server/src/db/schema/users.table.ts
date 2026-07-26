import * as p from 'drizzle-orm/pg-core';
import { tenants } from './tenants.table.js';

export const users = p.pgTable('users', {
  id: p.uuid().primaryKey().defaultRandom(),
  tenantId: p
    .uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  firebaseUid: p.text('firebase_uid').unique().notNull(),
  email: p.text('email').notNull().unique(),
  createdAt: p.timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: p
    .timestamp('updated_at', { withTimezone: true })
    .notNull()
    .$onUpdate(() => new Date())
    .defaultNow(),
});

export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;
