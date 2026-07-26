import fs from 'node:fs';
import { z } from 'zod';

export function loadValidatedEnv<T extends z.ZodType>(schema: T) {
  return function (): z.infer<T> {
    const envPath = `.env.${process.env.NODE_ENV || 'development'}`;
    try {
      const fileExists = fs.existsSync(envPath);

      if (!fileExists && process.env.NODE_ENV !== 'production') {
        console.error(`Missing required environment file: ${envPath}`);
        process.exit(1);
      }

      if (fileExists) {
        process.loadEnvFile(envPath);
      }

      return schema.parse(process.env);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Invalid environment variables:', error);
        console.error(error.issues);
      } else {
        console.error('Unexpected error while loading environment variables:', error);
      }
      process.exit(1);
    }
  };
}
