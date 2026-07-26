import { defineConfig } from 'drizzle-kit';
import { z } from 'zod';
import { loadValidatedEnv } from './src/shared/env-loader.js';

const envSchema = z.object({
  DATABASE_URL: z.url({ error: 'Please enter a valid URL address.' }),
});

const parsed = loadValidatedEnv(envSchema)();

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema',
  out: './src/db/migrations',
  dbCredentials: {
    url: parsed.DATABASE_URL,
  },
});
