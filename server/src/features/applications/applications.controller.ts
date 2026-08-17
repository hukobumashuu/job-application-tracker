import { Request, Response, NextFunction } from 'express';
import * as ApplicationService from './applications.service.js';
import {
  ApplicationIdParams,
  CreateApplicationInput,
  UpdateApplicationInput,
} from './applications.types.js';
import { ApiResponse } from '../../shared/utils/api-response.js';
import { PaginationQuery } from '../../shared/utils/pagination.js';

export async function createApplication(req: Request, res: Response, next: NextFunction) {
  try {
    const data = req.validated?.body as CreateApplicationInput;
    const application = await ApplicationService.createApplication(req.tenantId, data);
    res.status(201).json(ApiResponse.success(application, 'Application created successfully'));
  } catch (error) {
    next(error);
  }
}

export async function createManyApplications(req: Request, res: Response, next: NextFunction) {
  try {
    const data = req.validated?.body as CreateApplicationInput[];
    const result = await ApplicationService.createApplicationsBulk(req.tenantId, data);
    res.status(201).json(ApiResponse.success(result, 'Bulk import processed'));
  } catch (error) {
    next(error);
  }
}

export async function updateApplication(req: Request, res: Response, next: NextFunction) {
  try {
    const { id: applicationId } = req.validated?.params as ApplicationIdParams;
    const data = req.validated?.body as UpdateApplicationInput;
    const application = await ApplicationService.updateApplication(
      req.tenantId,
      applicationId,
      data
    );
    res.status(200).json(ApiResponse.success(application, 'Application updated successfully'));
  } catch (error) {
    next(error);
  }
}

export async function deleteApplication(req: Request, res: Response, next: NextFunction) {
  try {
    const { id: applicationId } = req.validated?.params as ApplicationIdParams;
    const result = await ApplicationService.deleteApplication(req.tenantId, applicationId);
    res.status(200).json(ApiResponse.success(result, 'Application deleted successfully'));
  } catch (error) {
    next(error);
  }
}

export async function getApplications(req: Request, res: Response, next: NextFunction) {
  try {
    const pagination = req.validated?.query as PaginationQuery;
    const result = await ApplicationService.getApplications(req.tenantId, pagination);
    res.status(200).json(ApiResponse.success(result, 'Applications successfully fetched'));
  } catch (error) {
    next(error);
  }
}
