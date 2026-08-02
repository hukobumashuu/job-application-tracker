import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { db, pool } from '../../config/db.js';
import { applications } from '../../db/schema/applications.table.js';
import { tenants } from '../../db/schema/tenants.table.js';
import { ApiError } from '../../shared/utils/api-error.js';
import { eq } from 'drizzle-orm';
import {
  createApplication,
  createApplicationsBulk,
  updateApplication,
  deleteApplication,
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

afterEach(async () => {
  // Only delete applications belonging to our specific test tenant
  await db.delete(applications).where(eq(applications.tenantId, tenantId));
});

afterAll(async () => {
  // Only delete the specific tenant we created
  await db.delete(tenants).where(eq(tenants.id, tenantId));
  await pool.end();
});

const baseInput = {
  company: 'Acme Corp',
  roleTitle: 'Backend Engineer',
  source: 'linkedin' as const,
};

describe('createApplication', () => {
  it('creates successfully when no conflict exists', async () => {
    const result = await createApplication(tenantId, baseInput);
    expect(result?.id).toBeDefined();
  });

  it('throws a 409 ApiError when the pre-check finds a same-day duplicate', async () => {
    await repoCreate(tenantId, baseInput);

    await expect(createApplication(tenantId, baseInput)).rejects.toMatchObject({
      statusCode: 409,
    });
    await expect(createApplication(tenantId, baseInput)).rejects.toBeInstanceOf(ApiError);
  });

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
  });
});

describe('createApplicationsBulk', () => {
  it('throws a 400 ApiError for an empty array', async () => {
    await expect(createApplicationsBulk(tenantId, [])).rejects.toMatchObject({ statusCode: 400 });
  });

  it('reports in-batch duplicates and creates the rest', async () => {
    const result = await createApplicationsBulk(tenantId, [
      baseInput,
      baseInput,
      { ...baseInput, company: 'Globex' },
    ]);

    expect(result.created).toHaveLength(2);
    expect(result.duplicatesWithinBatch).toHaveLength(1);
    expect(result.duplicatesAgainstExisting).toHaveLength(0);
  });

  it('reports duplicates against data that already existed before this batch', async () => {
    await repoCreate(tenantId, baseInput);

    const result = await createApplicationsBulk(tenantId, [
      baseInput,
      { ...baseInput, company: 'Initech' },
    ]);

    expect(result.created).toHaveLength(1);
    expect(result.duplicatesAgainstExisting).toHaveLength(1);
  });
});

describe('updateApplication', () => {
  it('throws a 404 ApiError when nothing matches', async () => {
    await expect(
      updateApplication(tenantId, '00000000-0000-0000-0000-000000000000', { company: 'X' })
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('deleteApplication', () => {
  it('throws a 404 ApiError when nothing matches', async () => {
    await expect(
      deleteApplication(tenantId, '00000000-0000-0000-0000-000000000000')
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('deletes successfully and returns the deleted row', async () => {
    const created = await createApplication(tenantId, baseInput);
    const deleted = await deleteApplication(tenantId, created!.id);
    expect(deleted?.id).toBe(created!.id);
  });
});
