import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { inArray } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { tenants } from '../../db/schema/tenants.table.js';
import { withRollback } from '../../shared/test-utils/with-rollback.js';
import {
  createApplication,
  createManyApplications,
  updateApplication,
  getApplicationById,
  getApplicationByCompanyAndRole,
  deleteApplication,
  getApplicationsByTenant,
} from './applications.repository.js';

let tenantId: string;
let otherTenantId: string;

beforeAll(async () => {
  const [tenant] = await db
    .insert(tenants)
    .values({ name: 'Test Tenant' })
    .returning({ id: tenants.id });
  const [otherTenant] = await db
    .insert(tenants)
    .values({ name: 'Other Tenant' })
    .returning({ id: tenants.id });

  if (!tenant || !otherTenant) throw new Error('Failed to seed test tenants');

  tenantId = tenant.id;
  otherTenantId = otherTenant.id;
});

afterAll(async () => {
  await db.delete(tenants).where(inArray(tenants.id, [tenantId, otherTenantId]));
});

const baseInput = {
  company: 'Acme Corp',
  roleTitle: 'Backend Engineer',
  source: 'linkedin' as const,
};

describe('createApplication', () => {
  it('creates a row and returns its id', () =>
    withRollback(async (tx) => {
      const result = await createApplication(tenantId, baseInput, tx);
      expect(result?.id).toBeDefined();
    }));

  it('stores dateApplied as the exact calendar date given, not shifted', () =>
    withRollback(async (tx) => {
      const created = await createApplication(
        tenantId,
        { ...baseInput, dateApplied: new Date('2026-07-31T00:00:00.000Z') },
        tx
      );
      const fetched = await getApplicationById(tenantId, created!.id, tx);
      expect(fetched?.dateApplied).toBe('2026-07-31');
    }));
});

describe('createManyApplications', () => {
  it('returns an empty array without touching the db when given no rows', () =>
    withRollback(async (tx) => {
      expect(await createManyApplications(tenantId, [], tx)).toEqual([]);
    }));

  it('creates multiple rows in one call', () =>
    withRollback(async (tx) => {
      const result = await createManyApplications(
        tenantId,
        [baseInput, { ...baseInput, company: 'Globex' }],
        tx
      );
      expect(result).toHaveLength(2);
    }));

  it('silently skips a row that duplicates one already in the database', () =>
    withRollback(async (tx) => {
      await createApplication(tenantId, baseInput, tx);
      const result = await createManyApplications(
        tenantId,
        [baseInput, { ...baseInput, company: 'Initech' }],
        tx
      );
      expect(result).toHaveLength(1);
      expect(result[0]?.company).toBe('Initech');
    }));
});

describe('updateApplication', () => {
  it('updates a field on a row belonging to the given tenant', () =>
    withRollback(async (tx) => {
      const created = await createApplication(tenantId, baseInput, tx);
      const updated = await updateApplication(tenantId, created!.id, { company: 'New Co' }, tx);
      expect(updated?.id).toBe(created!.id);
      const fetched = await getApplicationById(tenantId, created!.id, tx);
      expect(fetched?.company).toBe('New Co');
    }));

  it('returns undefined when the application belongs to a different tenant', () =>
    withRollback(async (tx) => {
      const created = await createApplication(tenantId, baseInput, tx);
      const result = await updateApplication(
        otherTenantId,
        created!.id,
        { company: 'Hijacked' },
        tx
      );
      expect(result).toBeUndefined();
    }));
});

describe('getApplicationById', () => {
  it('returns undefined for a non-existent id', () =>
    withRollback(async (tx) => {
      expect(
        await getApplicationById(tenantId, '00000000-0000-0000-0000-000000000000', tx)
      ).toBeUndefined();
    }));

  it('returns undefined when the id exists but belongs to a different tenant', () =>
    withRollback(async (tx) => {
      const created = await createApplication(tenantId, baseInput, tx);
      expect(await getApplicationById(otherTenantId, created!.id, tx)).toBeUndefined();
    }));
});

describe('getApplicationByCompanyAndRole', () => {
  it('matches case-insensitively, given the ilike change', () =>
    withRollback(async (tx) => {
      await createApplication(tenantId, { ...baseInput, company: 'Acme Corp' }, tx);
      const result = await getApplicationByCompanyAndRole(
        tenantId,
        'ACME CORP',
        'backend engineer',
        tx
      );
      expect(result).not.toBeUndefined();
    }));

  it('does not match across tenants', () =>
    withRollback(async (tx) => {
      await createApplication(tenantId, baseInput, tx);
      const result = await getApplicationByCompanyAndRole(
        otherTenantId,
        baseInput.company,
        baseInput.roleTitle,
        tx
      );
      expect(result).toBeUndefined();
    }));
});

describe('deleteApplication', () => {
  it('deletes a row and returns it', () =>
    withRollback(async (tx) => {
      const created = await createApplication(tenantId, baseInput, tx);
      const deleted = await deleteApplication(tenantId, created!.id, tx);
      expect(deleted?.id).toBe(created!.id);
      expect(await getApplicationById(tenantId, created!.id, tx)).toBeUndefined();
    }));

  it('returns undefined for a non-existent id', () =>
    withRollback(async (tx) => {
      expect(
        await deleteApplication(tenantId, '00000000-0000-0000-0000-000000000000', tx)
      ).toBeUndefined();
    }));

  it('returns undefined when the row belongs to a different tenant', () =>
    withRollback(async (tx) => {
      const created = await createApplication(tenantId, baseInput, tx);
      expect(await deleteApplication(otherTenantId, created!.id, tx)).toBeUndefined();
    }));
});

describe('getApplicationsByTenant', () => {
  it('returns an empty array and zero total for a tenant with no applications', () =>
    withRollback(async (tx) => {
      const result = await getApplicationsByTenant(tenantId, { page: 1, limit: 20 }, tx);
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    }));

  it('returns every application belonging to that tenant, within one page', () =>
    withRollback(async (tx) => {
      await createApplication(tenantId, baseInput, tx);
      await createApplication(tenantId, { ...baseInput, company: 'Globex' }, tx);
      const result = await getApplicationsByTenant(tenantId, { page: 1, limit: 20 }, tx);
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    }));

  it('does not include applications belonging to a different tenant', () =>
    withRollback(async (tx) => {
      await createApplication(tenantId, baseInput, tx);
      await createApplication(otherTenantId, { ...baseInput, company: 'Other Tenant Co' }, tx);
      const result = await getApplicationsByTenant(tenantId, { page: 1, limit: 20 }, tx);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    }));

  it('respects limit, and total reflects ALL matching rows, not just the current page', () =>
    withRollback(async (tx) => {
      await createApplication(tenantId, { ...baseInput, company: 'A' }, tx);
      await createApplication(tenantId, { ...baseInput, company: 'B' }, tx);
      await createApplication(tenantId, { ...baseInput, company: 'C' }, tx);
      const result = await getApplicationsByTenant(tenantId, { page: 1, limit: 2 }, tx);
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(3);
    }));

  it('offset moves to the next page correctly, with no overlap or gap', () =>
    withRollback(async (tx) => {
      await createApplication(tenantId, { ...baseInput, company: 'A' }, tx);
      await createApplication(tenantId, { ...baseInput, company: 'B' }, tx);
      await createApplication(tenantId, { ...baseInput, company: 'C' }, tx);
      const page1 = await getApplicationsByTenant(tenantId, { page: 1, limit: 2 }, tx);
      const page2 = await getApplicationsByTenant(tenantId, { page: 2, limit: 2 }, tx);
      expect(page1.data).toHaveLength(2);
      expect(page2.data).toHaveLength(1);
      expect(page1.data.map((r) => r.id)).not.toEqual(
        expect.arrayContaining(page2.data.map((r) => r.id))
      );
    }));
});
