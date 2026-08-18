import { z } from 'zod';
import { SelectApplication } from '../../db/schema/applications.table.js';
import {
  tenantIdParamSchema,
  createApplicationSchema,
  updateApplicationSchema,
  applicationIdParamSchema,
} from './applications.validation.js';
import { SelectTenant } from '../../db/schema/tenants.table.js';

export type Application = SelectApplication;

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;
export type TenantIdParams = z.infer<typeof tenantIdParamSchema>;
export type ApplicationIdParams = z.infer<typeof applicationIdParamSchema>;

export type ApplicationWithApplicant = Application & {
  tenant: Pick<SelectTenant, 'id' | 'name'>;
};

export interface BulkCreateResult {
  totalSubmitted: number;
  created: { id: string; company: string; roleTitle: string }[];
  duplicatesWithinBatch: { company: string; roleTitle: string }[];
  duplicatesAgainstExisting: { company: string; roleTitle: string }[];
}
