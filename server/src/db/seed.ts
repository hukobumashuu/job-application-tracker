import { db, pool } from '../config/db.js';
import { tenants } from './schema/tenants.table.js';
import { DEV_TENANT_ID } from '../shared/utils/dev-tenant.js';

async function seed() {
  await db
    .insert(tenants)
    .values({ id: DEV_TENANT_ID, name: 'Dev Tenant' })
    .onConflictDoNothing({ target: tenants.id });

  console.log(`Seeded dev tenant: ${DEV_TENANT_ID}`);
  await pool.end();
}

seed().catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
