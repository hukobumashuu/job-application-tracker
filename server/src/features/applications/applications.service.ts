import {
  CreateApplicationInput,
  UpdateApplicationInput,
  BulkCreateResult,
} from './applications.types.js';
import * as ApplicationRepo from './applications.repository.js';
import { ApiError } from '../../shared/utils/api-error.js';
import { buildPaginationMeta, type PaginationQuery } from '../../shared/utils/pagination.js';
import { db, DbClient } from '../../config/db.js';

export async function getApplications(
  tenantId: string,
  pagination: PaginationQuery,
  dbClient: DbClient = db
) {
  const { data, total } = await ApplicationRepo.getApplicationsByTenant(
    tenantId,
    pagination,
    dbClient
  );
  return { data, pagination: buildPaginationMeta(total, pagination) };
}

export async function createApplication(
  tenantId: string,
  data: CreateApplicationInput,
  dbClient: DbClient = db
) {
  const formattedDate =
    ApplicationRepo.formatToLocalDate(data.dateApplied) ??
    ApplicationRepo.formatToLocalDate(new Date());

  const existingApplication = await ApplicationRepo.getApplicationByCompanyAndRole(
    tenantId,
    data.company,
    data.roleTitle,
    dbClient
  );

  if (existingApplication?.dateApplied === formattedDate) {
    throw ApiError.conflict('Application already exists with the same date applied');
  }

  try {
    return await ApplicationRepo.createApplication(tenantId, data, dbClient);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw ApiError.conflict('A database conflict occurred: this application already exists.');
    }
    throw error;
  }
}

export const createApplicationsBulk = async (
  tenantId: string,
  data: CreateApplicationInput[],
  dbClient: DbClient = db
): Promise<BulkCreateResult> => {
  if (data.length === 0) throw ApiError.badRequest('At least one application is required');

  const { deduped, duplicatesWithinBatch } = splitDuplicatesWithinBatch(data);
  const inserted = await ApplicationRepo.createManyApplications(tenantId, deduped, dbClient);
  const duplicatesAgainstExisting = findDuplicatesAgainstExisting(deduped, inserted);

  return {
    totalSubmitted: data.length,
    created: inserted.map((row) => ({
      id: row.id,
      company: row.company,
      roleTitle: row.roleTitle,
    })),
    duplicatesWithinBatch: duplicatesWithinBatch.map((a) => ({
      company: a.company,
      roleTitle: a.roleTitle,
    })),
    duplicatesAgainstExisting: duplicatesAgainstExisting.map((a) => ({
      company: a.company,
      roleTitle: a.roleTitle,
    })),
  };
};

export async function updateApplication(
  tenantId: string,
  applicationId: string,
  data: UpdateApplicationInput,
  dbClient: DbClient = db
) {
  const application = await ApplicationRepo.updateApplication(
    tenantId,
    applicationId,
    data,
    dbClient
  );
  if (!application) {
    throw ApiError.notFound('Application not found');
  }
  return application;
}

export async function deleteApplication(
  tenantId: string,
  applicationId: string,
  dbClient: DbClient = db
) {
  const application = await ApplicationRepo.deleteApplication(tenantId, applicationId, dbClient);
  if (!application) {
    throw ApiError.notFound('Application not found');
  }
  return application;
}

// ---- helpers ----

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const err = error as { code?: unknown; cause?: { code?: unknown } };
  return err.code === '23505' || err.cause?.code === '23505';
}

const getNaturalKey = (app: CreateApplicationInput): string => {
  const date =
    ApplicationRepo.formatToLocalDate(app.dateApplied) ??
    ApplicationRepo.formatToLocalDate(new Date());
  return `${app.company.trim().toLowerCase()}|${app.roleTitle.trim().toLowerCase()}|${date}`;
};

function splitDuplicatesWithinBatch(data: CreateApplicationInput[]): {
  deduped: CreateApplicationInput[];
  duplicatesWithinBatch: CreateApplicationInput[];
} {
  const seen = new Map<string, CreateApplicationInput>();
  const duplicatesWithinBatch: CreateApplicationInput[] = [];

  for (const app of data) {
    const key = getNaturalKey(app);
    if (seen.has(key)) {
      duplicatesWithinBatch.push(app);
    } else {
      seen.set(key, app);
    }
  }

  return { deduped: [...seen.values()], duplicatesWithinBatch };
}

function findDuplicatesAgainstExisting(
  attempted: CreateApplicationInput[],
  inserted: { company: string; roleTitle: string; dateApplied: string }[]
): CreateApplicationInput[] {
  const insertedKeys = new Set(
    inserted.map(
      (row) =>
        `${row.company.trim().toLowerCase()}|${row.roleTitle.trim().toLowerCase()}|${row.dateApplied}`
    )
  );
  return attempted.filter((app) => !insertedKeys.has(getNaturalKey(app)));
}
