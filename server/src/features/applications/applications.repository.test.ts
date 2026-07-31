import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { db, pool } from '../../config/db.js';
import { applications } from '../../db/schema/applications.table.js';
import { tenants } from '../../db/schema/tenants.table.js';
import {
  createApplication,
  createManyApplications,
  updateApplication,
  getApplicationById,
  getApplicationByCompanyAndRole,
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

  if (!tenant || !otherTenant) {
    throw new Error('Failed to seed test tenants');
  }

  tenantId = tenant.id;
  otherTenantId = otherTenant.id;
});

afterEach(async () => {
  await db.delete(applications);
});

afterAll(async () => {
  await db.delete(tenants);
  await pool.end();
});

const baseInput = {
  company: 'Acme Corp',
  roleTitle: 'Backend Engineer',
  source: 'linkedin' as const,
};

describe('createApplication', () => {
  it('creates a row and returns its id', async () => {
    const result = await createApplication(tenantId, baseInput);
    expect(result?.id).toBeDefined();
  });

  it('stores dateApplied as the exact calendar date given, not shifted', async () => {
    const created = await createApplication(tenantId, {
      ...baseInput,
      dateApplied: new Date('2026-07-31T00:00:00.000Z'),
    });
    const fetched = await getApplicationById(tenantId, created!.id);
    expect(fetched?.dateApplied).toBe('2026-07-31');
  });
});

describe('createManyApplications', () => {
  it('returns an empty array without touching the db when given no rows', async () => {
    const result = await createManyApplications(tenantId, []);
    expect(result).toEqual([]);
  });

  it('creates multiple rows in one call', async () => {
    const result = await createManyApplications(tenantId, [
      baseInput,
      { ...baseInput, company: 'Globex' },
    ]);
    expect(result).toHaveLength(2);
  });
});

describe('updateApplication', () => {
  it('updates a field on a row belonging to the given tenant', async () => {
    const created = await createApplication(tenantId, baseInput);
    const updated = await updateApplication(tenantId, created!.id, { company: 'New Co' });
    expect(updated?.id).toBe(created!.id);
    const fetched = await getApplicationById(tenantId, created!.id);
    expect(fetched?.company).toBe('New Co');
  });

  it('returns undefined when the application belongs to a different tenant', async () => {
    const created = await createApplication(tenantId, baseInput);
    const result = await updateApplication(otherTenantId, created!.id, { company: 'Hijacked' });
    expect(result).toBeUndefined();
  });
});

describe('getApplicationById', () => {
  it('returns null for a non-existent id', async () => {
    const result = await getApplicationById(tenantId, '00000000-0000-0000-0000-000000000000');
    expect(result).toBeNull();
  });

  it('returns null when the id exists but belongs to a different tenant', async () => {
    const created = await createApplication(tenantId, baseInput);
    const result = await getApplicationById(otherTenantId, created!.id);
    expect(result).toBeNull();
  });
});

describe('getApplicationByCompanyAndRole', () => {
  it('matches case-insensitively, given the ilike change', async () => {
    await createApplication(tenantId, { ...baseInput, company: 'Acme Corp' });
    const result = await getApplicationByCompanyAndRole(tenantId, 'ACME CORP', 'backend engineer');
    expect(result).not.toBeNull();
  });

  it('does not match across tenants', async () => {
    await createApplication(tenantId, baseInput);
    const result = await getApplicationByCompanyAndRole(
      otherTenantId,
      baseInput.company,
      baseInput.roleTitle
    );
    expect(result).toBeNull();
  });
});
