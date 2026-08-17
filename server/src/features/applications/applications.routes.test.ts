import { describe, it, expect, afterEach } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { app } from '../../app.js';
import { db } from '../../config/db.js';
import { applications } from '../../db/schema/applications.table.js';
import { DEV_TENANT_ID } from '../../shared/utils/dev-tenant.js';

afterEach(async () => {
  await db.delete(applications).where(eq(applications.tenantId, DEV_TENANT_ID));
});

const baseInput = {
  company: 'Route Test Corp',
  roleTitle: 'QA Engineer',
  source: 'linkedin',
};

describe('POST /applications', () => {
  it('creates an application and returns 201 with the full row', async () => {
    const response = await request(app).post('/applications').send(baseInput);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.company).toBe('Route Test Corp');
    expect(response.body.data.id).toBeDefined();
  });

  it('returns 400 when the body fails validation', async () => {
    const response = await request(app)
      .post('/applications')
      .send({ ...baseInput, company: '' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('returns 409 when the same application already exists today', async () => {
    await request(app).post('/applications').send(baseInput);
    const response = await request(app).post('/applications').send(baseInput);

    expect(response.status).toBe(409);
  });
});

describe('POST /applications/bulk', () => {
  it('creates rows and reports in-batch duplicates', async () => {
    const response = await request(app)
      .post('/applications/bulk')
      .send([baseInput, baseInput, { ...baseInput, company: 'Globex Route' }]);

    expect(response.status).toBe(201);
    expect(response.body.data.created).toHaveLength(2);
    expect(response.body.data.duplicatesWithinBatch).toHaveLength(1);
  });

  it('returns 400 for an empty array', async () => {
    const response = await request(app).post('/applications/bulk').send([]);
    expect(response.status).toBe(400);
  });
});

describe('GET /applications', () => {
  it('returns paginated results with default page/limit', async () => {
    await request(app).post('/applications').send(baseInput);

    const response = await request(app).get('/applications');

    expect(response.status).toBe(200);
    expect(response.body.data.data).toHaveLength(1);
    expect(response.body.data.pagination).toMatchObject({ page: 1, limit: 20, total: 1 });
  });

  it('respects explicit page and limit query params', async () => {
    await request(app)
      .post('/applications')
      .send({ ...baseInput, company: 'A' });
    await request(app)
      .post('/applications')
      .send({ ...baseInput, company: 'B' });
    await request(app)
      .post('/applications')
      .send({ ...baseInput, company: 'C' });

    const response = await request(app).get('/applications').query({ page: 2, limit: 2 });

    expect(response.body.data.data).toHaveLength(1);
    expect(response.body.data.pagination.total).toBe(3);
  });
});

describe('PATCH /applications/:id', () => {
  it('updates an existing application and returns 200 with the full row', async () => {
    const created = await request(app).post('/applications').send(baseInput);
    const id = created.body.data.id;

    const response = await request(app)
      .patch(`/applications/${id}`)
      .send({ company: 'Updated Co' });

    expect(response.status).toBe(200);
    expect(response.body.data.company).toBe('Updated Co');
  });

  it('returns 404 for a well-formed but non-existent id', async () => {
    const response = await request(app)
      .patch('/applications/00000000-0000-0000-0000-000000000000')
      .send({ company: 'X' });

    expect(response.status).toBe(404);
  });

  it('returns 400 for a malformed id, before ever reaching the controller', async () => {
    const response = await request(app).patch('/applications/not-a-uuid').send({ company: 'X' });
    expect(response.status).toBe(400);
  });
});

describe('DELETE /applications/:id', () => {
  it('deletes an existing application and returns 200 with the deleted row', async () => {
    const created = await request(app).post('/applications').send(baseInput);
    const id = created.body.data.id;

    const response = await request(app).delete(`/applications/${id}`);

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(id);
  });

  it('returns 404 for a non-existent id', async () => {
    const response = await request(app).delete(
      '/applications/00000000-0000-0000-0000-000000000000'
    );
    expect(response.status).toBe(404);
  });
});
