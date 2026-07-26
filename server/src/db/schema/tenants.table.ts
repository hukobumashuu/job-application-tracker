import * as p from 'drizzle-orm/pg-core';

export const tenants = p.pgTable('tenants', {
  id: p.uuid().primaryKey().defaultRandom(),
  name: p.text('name').notNull(),
  createdAt: p.timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: p
    .timestamp('updated_at', { withTimezone: true })
    .notNull()
    .$onUpdate(() => new Date())
    .defaultNow(),
});

export type InsertTenant = typeof tenants.$inferInsert;
export type SelectTenant = typeof tenants.$inferSelect;
