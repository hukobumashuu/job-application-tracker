import * as p from 'drizzle-orm/pg-core';
import { tenants } from './tenants.table.js';
import { sql } from 'drizzle-orm';

export const sourceEnum = p.pgEnum('source_enum', [
  'linkedin',
  'jobstreet',
  'bossjob',
  'referral',
  'company_site',
  'other',
]);

export const statusEnum = p.pgEnum('status_enum', [
  'applied',
  'interviewing',
  'offer',
  'rejected',
  'ghosted',
  'withdrawn',
]);

export const applications = p.pgTable('applications', {
  id: p.uuid().primaryKey().defaultRandom(),
  tenantId: p
    .uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  company: p.text('company').notNull(),
  roleTitle: p.text('role_title').notNull(),
  source: sourceEnum('source').notNull(),
  status: statusEnum('status').default('applied').notNull(),
  dateApplied: p
    .date('date_applied')
    .default(sql`CURRENT_DATE`)
    .notNull(),
  lastStatusChange: p
    .timestamp('last_status_change', { withTimezone: true })
    .defaultNow()
    .notNull(),
  jobUrl: p.text('job_url'),
  contactName: p.text('contact_name'),
  contactEmail: p.text('contact_email'),
  notes: p.text('notes'),
  createdAt: p.timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: p
    .timestamp('updated_at', { withTimezone: true })
    .notNull()
    .$onUpdate(() => new Date())
    .defaultNow(),
});

export type InsertApplication = typeof applications.$inferInsert;
export type SelectApplication = typeof applications.$inferSelect;
