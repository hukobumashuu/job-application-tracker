// server/src/shared/utils/api-error.test.ts
import { describe, it, expect } from 'vitest';
import { ApiError } from './api-error.js';

describe('ApiError', () => {
  it('conflict() produces a 409 with isOperational true', () => {
    const error = ApiError.conflict('duplicate');
    expect(error).toBeInstanceOf(ApiError);
    expect(error.statusCode).toBe(409);
    expect(error.isOperational).toBe(true);
    expect(error.message).toBe('duplicate');
  });

  it('notFound() produces a 404', () => {
    expect(ApiError.notFound('missing').statusCode).toBe(404);
  });

  it('badRequest() produces a 400', () => {
    expect(ApiError.badRequest('bad').statusCode).toBe(400);
  });
});
