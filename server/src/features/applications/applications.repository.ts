import { db, DbClient } from '../../config/db.js';
import { applications } from '../../db/schema/applications.table.js';
import { eq, and, ilike } from 'drizzle-orm';
import { CreateApplicationInput, UpdateApplicationInput } from './applications.types.js';
import { getOffset, type PaginationQuery } from '../../shared/utils/pagination.js';

export const formatToLocalDate = (date?: Date) => {
  if (!date) return undefined;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export async function getApplicationsByTenant(
  tenantId: string,
  pagination: PaginationQuery,
  dbClient: DbClient = db
) {
  const offset = getOffset(pagination);

  const [data, total] = await Promise.all([
    dbClient
      .select()
      .from(applications)
      .where(eq(applications.tenantId, tenantId))
      .limit(pagination.limit)
      .offset(offset),
    dbClient.$count(applications, eq(applications.tenantId, tenantId)),
  ]);

  return { data, total };
}

export const createApplication = async (
  tenantId: string,
  data: CreateApplicationInput,
  dbClient: DbClient = db
) => {
  const [newApplication] = await dbClient
    .insert(applications)
    .values({ ...data, tenantId, dateApplied: formatToLocalDate(data.dateApplied) })
    .returning({ id: applications.id });

  return newApplication;
};

export const createManyApplications = async (
  tenantId: string,
  data: CreateApplicationInput[],
  dbClient: DbClient = db
) => {
  if (data.length === 0) return [];

  const formattedData = data.map((app) => ({
    ...app,
    tenantId,
    dateApplied: formatToLocalDate(app.dateApplied),
  }));

  const inserted = await dbClient
    .insert(applications)
    .values(formattedData)
    .onConflictDoNothing({
      target: [
        applications.tenantId,
        applications.company,
        applications.roleTitle,
        applications.dateApplied,
      ],
    })
    .returning({
      id: applications.id,
      company: applications.company,
      roleTitle: applications.roleTitle,
      dateApplied: applications.dateApplied,
    });

  return inserted;
};

export const updateApplication = async (
  tenantId: string,
  applicationId: string,
  data: UpdateApplicationInput,
  dbClient: DbClient = db
) => {
  const [updatedApplication] = await dbClient
    .update(applications)
    .set({ ...data, dateApplied: formatToLocalDate(data.dateApplied) })
    .where(and(eq(applications.tenantId, tenantId), eq(applications.id, applicationId)))
    .returning({ id: applications.id });

  return updatedApplication;
};

export const getApplicationById = async (
  tenantId: string,
  applicationId: string,
  dbClient: DbClient = db
) => {
  const [application] = await dbClient
    .select()
    .from(applications)
    .where(and(eq(applications.tenantId, tenantId), eq(applications.id, applicationId)));

  return application;
};

export const getApplicationByCompanyAndRole = async (
  tenantId: string,
  company: string,
  roleTitle: string,
  dbClient: DbClient = db
) => {
  const [application] = await dbClient
    .select()
    .from(applications)
    .where(
      and(
        eq(applications.tenantId, tenantId),
        ilike(applications.company, company),
        ilike(applications.roleTitle, roleTitle)
      )
    );

  return application;
};

export const deleteApplication = async (
  tenantId: string,
  applicationId: string,
  dbClient: DbClient = db
) => {
  const [deletedApplication] = await dbClient
    .delete(applications)
    .where(and(eq(applications.tenantId, tenantId), eq(applications.id, applicationId)))
    .returning({ id: applications.id });

  return deletedApplication;
};
