import { z } from 'zod';
import { SelectApplication, InsertApplication } from '../../db/schema/applications.table.js';
import {
  tenantIdParamSchema,
  createApplicationSchema,
  updateApplicationSchema,
} from './applications.validation.js';
import { SelectTenant } from '../../db/schema/tenants.table.js';

export type Application = SelectApplication;
export type NewApplication = InsertApplication;

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;
export type TenantIdParams = z.infer<typeof tenantIdParamSchema>;

export type ApplicationListFilter = {
  tenantId: string;
  status?: Application['status'];
  search?: string;
  page?: number;
  limit?: number;
};

export type ApplicationWithApplicant = Application & {
  tenant: Pick<SelectTenant, 'id' | 'name'>;
};
