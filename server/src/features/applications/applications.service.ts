import {
  CreateApplicationInput,
  UpdateApplicationInput,
  BulkCreateResult,
} from './applications.types.js';
import * as ApplicationRepo from './applications.repository.js';
import { ApiError } from '../../shared/utils/api-error.js';

export async function createApplication(tenantId: string, data: CreateApplicationInput) {
  const formattedDate = ApplicationRepo.formatToLocalDate(data.dateApplied);
  const existingApplication = await ApplicationRepo.getApplicationByCompanyAndRole(
    tenantId,
    data.company,
    data.roleTitle
  );

  if (existingApplication?.dateApplied === formattedDate) {
    throw ApiError.conflict('Application already exists with the same date applied');
  }

  try {
    return await ApplicationRepo.createApplication(tenantId, data);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw ApiError.conflict('A database conflict occurred: this application already exists.');
    }
    throw error;
  }
}

export const createApplicationsBulk = async (
  tenantId: string,
  data: CreateApplicationInput[]
): Promise<BulkCreateResult> => {
  if (data.length === 0) throw ApiError.badRequest('At least one application is required');

  const { deduped, duplicatesWithinBatch } = splitDuplicatesWithinBatch(data);
  const inserted = await ApplicationRepo.createManyApplications(tenantId, deduped);
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
  data: UpdateApplicationInput
) {
  const application = await ApplicationRepo.updateApplication(tenantId, applicationId, data);
  if (!application) {
    throw ApiError.notFound('Application not found');
  }
  return application;
}

export async function deleteApplication(tenantId: string, applicationId: string) {
  const application = await ApplicationRepo.deleteApplication(tenantId, applicationId);
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
