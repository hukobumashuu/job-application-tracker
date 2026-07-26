import { config } from './config/env.js';
import { app } from './app.js';
import { db } from './config/db.js';
import { sql } from 'drizzle-orm';

(async () => {
  try {
    await db.execute(sql`SELECT 1`);
    console.log('Database connection established successfully');

    const server = app.listen(config.port, () => {
      console.log(`Server is running in ${config.env} mode on port ${config.port}`);
    });

    server.on('error', (error) => {
      console.error('Server failed to start:', error);
      process.exit(1);
    });
  } catch (error) {
    console.error('Unable to connect to the database', error);
    process.exit(1);
  }
})();
