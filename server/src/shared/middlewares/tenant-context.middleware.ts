import { Request, Response, NextFunction } from 'express';
import { DEV_TENANT_ID } from '../utils/dev-tenant.js';

export function tenantContext(req: Request, _res: Response, next: NextFunction) {
  req.tenantId = DEV_TENANT_ID; // TEMPORARY — replace with real resolution
  next();
}
