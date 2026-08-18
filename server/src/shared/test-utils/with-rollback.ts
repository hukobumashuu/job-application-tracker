import { db, type DbClient } from '../../config/db.js';

class RollbackSignal extends Error {}

export async function withRollback(testFn: (tx: DbClient) => Promise<void>): Promise<void> {
  await db
    .transaction(async (tx) => {
      await testFn(tx);
      throw new RollbackSignal();
    })
    .catch((error) => {
      if (!(error instanceof RollbackSignal)) throw error;
    });
}
