import { db } from '../../config/db.js';
import { applications } from '../../db/schema/applications.table.js';
import { eq, and, ilike } from 'drizzle-orm';
import { CreateApplicationInput, UpdateApplicationInput } from './applications.types.js';

export const formatToLocalDate = (date?: Date) => {
  if (!date) return undefined;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const createApplication = async (tenantId: string, data: CreateApplicationInput) => {
  const [newApplication] = await db
    .insert(applications)
    .values({ ...data, tenantId, dateApplied: formatToLocalDate(data.dateApplied) })
    .returning({ id: applications.id });

  return newApplication;
};

export const createManyApplications = async (tenantId: string, data: CreateApplicationInput[]) => {
  if (data.length === 0) return [];

  const formattedData = data.map((app) => ({
    ...app,
    tenantId,
    dateApplied: formatToLocalDate(app.dateApplied),
  }));

  const inserted = await db
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
  data: UpdateApplicationInput
) => {
  const [updatedApplication] = await db
    .update(applications)
    .set({ ...data, dateApplied: formatToLocalDate(data.dateApplied) })
    .where(and(eq(applications.tenantId, tenantId), eq(applications.id, applicationId)))
    .returning({ id: applications.id });

  return updatedApplication;
};

export const getApplicationById = async (tenantId: string, applicationId: string) => {
  const [application] = await db
    .select()
    .from(applications)
    .where(and(eq(applications.tenantId, tenantId), eq(applications.id, applicationId)));

  return application;
};

export const getApplicationByCompanyAndRole = async (
  tenantId: string,
  company: string,
  roleTitle: string
) => {
  const [application] = await db
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

export const deleteApplication = async (tenantId: string, applicationId: string) => {
  const [deletedApplication] = await db
    .delete(applications)
    .where(and(eq(applications.tenantId, tenantId), eq(applications.id, applicationId)))
    .returning({ id: applications.id });

  return deletedApplication;
};
