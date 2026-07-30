// server/src/features/applications/applications.validation.test.ts
import { describe, it, expect } from 'vitest';
import {
  tenantIdParamSchema,
  applicationIdParamSchema,
  createApplicationSchema,
  updateApplicationSchema,
} from './applications.validation.js';

describe('tenantIdParamSchema', () => {
  it('accepts a valid UUID', () => {
    const result = tenantIdParamSchema.safeParse({
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a malformed UUID', () => {
    const result = tenantIdParamSchema.safeParse({ tenantId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects a missing tenantId', () => {
    const result = tenantIdParamSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('applicationIdParamSchema', () => {
  it('accepts a valid UUID under the id key', () => {
    const result = applicationIdParamSchema.safeParse({
      id: '123e4567-e89b-12d3-a456-426614174000',
    });
    expect(result.success).toBe(true);
  });
});

describe('createApplicationSchema', () => {
  const validInput = {
    company: 'Acme Corp',
    roleTitle: 'Backend Engineer',
    source: 'linkedin',
  };

  it('accepts minimal valid input', () => {
    const result = createApplicationSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('rejects a missing required field (company)', () => {
    const { company, ...rest } = validInput;
    const result = createApplicationSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects an empty company after trimming', () => {
    const result = createApplicationSchema.safeParse({ ...validInput, company: '   ' });
    expect(result.success).toBe(false);
  });

  it('rejects a company longer than 100 characters', () => {
    const result = createApplicationSchema.safeParse({ ...validInput, company: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid source enum value', () => {
    const result = createApplicationSchema.safeParse({ ...validInput, source: 'craigslist' });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown field, since the schema is strict', () => {
    const result = createApplicationSchema.safeParse({ ...validInput, notAField: 'oops' });
    expect(result.success).toBe(false);
  });

  it('accepts an empty string for optional jobUrl', () => {
    const result = createApplicationSchema.safeParse({ ...validInput, jobUrl: '' });
    expect(result.success).toBe(true);
  });

  it('rejects a malformed jobUrl that is not empty', () => {
    const result = createApplicationSchema.safeParse({ ...validInput, jobUrl: 'not-a-url' });
    expect(result.success).toBe(false);
  });

  // These two don't assert an expected answer on purpose — run them and read
  // the actual result. That tells you, for real, whether .trim() chained after
  // z.url()/z.email() runs before or after the format check.
  it('DISCOVERY: does a URL with surrounding whitespace pass, and what does it become?', () => {
    const result = createApplicationSchema.safeParse({
      ...validInput,
      jobUrl: '  https://example.com  ',
    });
    console.log('jobUrl result:', result.success ? result.data.jobUrl : result.error.issues);
  });

  it('DISCOVERY: does an email with surrounding whitespace pass, and what does it become?', () => {
    const result = createApplicationSchema.safeParse({
      ...validInput,
      contactEmail: '  a@b.com  ',
    });
    console.log(
      'contactEmail result:',
      result.success ? result.data.contactEmail : result.error.issues
    );
  });
});

describe('updateApplicationSchema', () => {
  it('accepts a partial update with one field', () => {
    const result = updateApplicationSchema.safeParse({ company: 'New Co' });
    expect(result.success).toBe(true);
  });

  it('rejects a completely empty update payload', () => {
    const result = updateApplicationSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
