import { z } from 'zod';
import { loadValidatedEnv } from '../shared/env-loader.js';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  PORT: z.coerce.number({ error: 'This value must be a number' }),
  DATABASE_URL: z.url({ error: 'Please enter a valid URL address.' }),
});

const parsed = loadValidatedEnv(envSchema)();

export const config = { env: parsed.NODE_ENV, port: parsed.PORT, dbUrl: parsed.DATABASE_URL };
