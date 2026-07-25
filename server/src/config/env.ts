import { z } from 'zod';

const envPath = `.env.${process.env.NODE_ENV || 'development'}`;

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.coerce.number({ error: 'This value must be a number' }),
  DATABASE_URL: z.url({ error: 'Please enter a valid URL address.' }),
});

function validateAndLoadConfig() {
  try {
    process.loadEnvFile(envPath);
    const parsed = envSchema.parse(process.env);
    return { env: parsed.NODE_ENV, port: parsed.PORT, dbUrl: parsed.DATABASE_URL };
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Invalid environment variables:', error);
      console.error(error.issues);
    } else {
      console.error('Unexpected error while loading environment variables:', error);
    }
    process.exit(1);
  }
}

export const config = validateAndLoadConfig();
