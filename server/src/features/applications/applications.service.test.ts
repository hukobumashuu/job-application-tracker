import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { applications } from '../../db/schema/applications.table.js';
import { tenants } from '../../db/schema/tenants.table.js';
import { ApiError } from '../../shared/utils/api-error.js';
import { withRollback } from '../../shared/test-utils/with-rollback.js';
import {
  createApplication,
  createApplicationsBulk,
  updateApplication,
  deleteApplication,
  getApplications,
} from './applications.service.js';
import { createApplication as repoCreate } from './applications.repository.js';

let tenantId: string;

beforeAll(async () => {
  const [tenant] = await db
    .insert(tenants)
    .values({ name: 'Service Test Tenant' })
    .returning({ id: tenants.id });
  if (!tenant) throw new Error('Failed to seed test tenant');
  tenantId = tenant.id;
});

afterAll(async () => {
  await db.delete(tenants).where(eq(tenants.id, tenantId));
});

const baseInput = {
  company: 'Service Test Corp',
  roleTitle: 'Backend Engineer',
  source: 'linkedin' as const,
};

describe('createApplication', () => {
  it('creates successfully when no conflict exists', () =>
    withRollback(async (tx) => {
      const result = await createApplication(tenantId, baseInput, tx);
      expect(result?.id).toBeDefined();
    }));

  it('throws a 409 ApiError when the pre-check finds a same-day duplicate', () =>
    withRollback(async (tx) => {
      await repoCreate(tenantId, baseInput, tx);
      await expect(createApplication(tenantId, baseInput, tx)).rejects.toBeInstanceOf(ApiError);
      await expect(createApplication(tenantId, baseInput, tx)).rejects.toMatchObject({
        statusCode: 409,
      });
    }));

  it('throws a 409 ApiError, not a raw Postgres error, when two concurrent creates race', async () => {
    const results = await Promise.allSettled([
      createApplication(tenantId, baseInput),
      createApplication(tenantId, baseInput),
    ]);

    const succeeded = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected');

    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);
    if (failed[0]?.status === 'rejected') {
      expect(failed[0].reason).toBeInstanceOf(ApiError);
      expect(failed[0].reason.statusCode).toBe(409);
    }

    await db.delete(applications).where(eq(applications.tenantId, tenantId));
  });
});

describe('createApplicationsBulk', () => {
  it('throws a 400 ApiError for an empty array', () =>
    withRollback(async (tx) => {
      await expect(createApplicationsBulk(tenantId, [], tx)).rejects.toMatchObject({
        statusCode: 400,
      });
    }));

  it('reports in-batch duplicates and creates the rest', () =>
    withRollback(async (tx) => {
      const result = await createApplicationsBulk(
        tenantId,
        [baseInput, baseInput, { ...baseInput, company: 'Globex Service' }],
        tx
      );
      expect(result.created).toHaveLength(2);
      expect(result.duplicatesWithinBatch).toHaveLength(1);
      expect(result.duplicatesAgainstExisting).toHaveLength(0);
    }));

  it('reports duplicates against data that already existed before this batch', () =>
    withRollback(async (tx) => {
      await repoCreate(tenantId, baseInput, tx);
      const result = await createApplicationsBulk(
        tenantId,
        [baseInput, { ...baseInput, company: 'Initech Service' }],
        tx
      );
      expect(result.created).toHaveLength(1);
      expect(result.duplicatesAgainstExisting).toHaveLength(1);
    }));
});

describe('updateApplication', () => {
  it('throws a 404 ApiError when nothing matches', () =>
    withRollback(async (tx) => {
      await expect(
        updateApplication(tenantId, '00000000-0000-0000-0000-000000000000', { company: 'X' }, tx)
      ).rejects.toMatchObject({ statusCode: 404 });
    }));
});

describe('deleteApplication', () => {
  it('throws a 404 ApiError when nothing matches', () =>
    withRollback(async (tx) => {
      await expect(
        deleteApplication(tenantId, '00000000-0000-0000-0000-000000000000', tx)
      ).rejects.toMatchObject({ statusCode: 404 });
    }));

  it('deletes successfully and returns the deleted row', () =>
    withRollback(async (tx) => {
      const created = await createApplication(tenantId, baseInput, tx);
      const deleted = await deleteApplication(tenantId, created!.id, tx);
      expect(deleted?.id).toBe(created!.id);
    }));
});

describe('getApplications', () => {
  it('returns applications wrapped with pagination metadata', () =>
    withRollback(async (tx) => {
      await createApplication(tenantId, baseInput, tx);
      const result = await getApplications(tenantId, { page: 1, limit: 20 }, tx);
      expect(result.data).toHaveLength(1);
      expect(result.pagination).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
    }));
});
