import { z } from 'zod';
import { sourceEnum } from '../../db/schema/applications.table.js';

export const tenantIdParamSchema = z.object({
  tenantId: z.uuid('Invalid or missing tenant ID'),
});

export const applicationIdParamSchema = z.object({
  id: z.uuid('Invalid or missing ID'),
});

export const createApplicationSchema = z.strictObject({
  company: z.string().trim().min(1, 'Company cannot be empty').max(100),
  roleTitle: z.string().trim().min(1, 'Role cannot be empty').max(100),
  source: z.enum(sourceEnum.enumValues, 'Invalid application source'),
  dateApplied: z.coerce.date().optional(),
  jobUrl: z
    .string()
    .trim()
    .max(2000)
    .pipe(z.url('Invalid url format'))
    .optional()
    .or(z.literal('')),
  contactName: z.string().trim().max(255).optional(),
  contactEmail: z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .pipe(z.email('Invalid email format'))
    .optional()
    .or(z.literal('')),
  notes: z.string().trim().max(2000).optional(),
});

export const updateApplicationSchema = createApplicationSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Update payload cannot be empty');
