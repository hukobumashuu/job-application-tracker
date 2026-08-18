import { describe, it, expect } from 'vitest';
import { paginationQuerySchema, getOffset, buildPaginationMeta } from './pagination.js';

describe('paginationQuerySchema', () => {
  it('defaults to page 1, limit 20 when nothing is provided', () => {
    const result = paginationQuerySchema.parse({});
    expect(result).toEqual({ page: 1, limit: 20 });
  });

  it('coerces string query params into numbers', () => {
    const result = paginationQuerySchema.parse({ page: '3', limit: '50' });
    expect(result).toEqual({ page: 3, limit: 50 });
  });

  it('rejects a limit above 100', () => {
    expect(paginationQuerySchema.safeParse({ limit: 101 }).success).toBe(false);
  });

  it('rejects page 0 or below', () => {
    expect(paginationQuerySchema.safeParse({ page: 0 }).success).toBe(false);
  });
});

describe('getOffset', () => {
  it('returns 0 for page 1', () => {
    expect(getOffset({ page: 1, limit: 20 })).toBe(0);
  });

  it('returns limit for page 2', () => {
    expect(getOffset({ page: 2, limit: 20 })).toBe(20);
  });
});

describe('buildPaginationMeta', () => {
  it('rounds totalPages up, not down, for a partial last page', () => {
    const meta = buildPaginationMeta(45, { page: 1, limit: 20 });
    expect(meta.totalPages).toBe(3);
  });
});
