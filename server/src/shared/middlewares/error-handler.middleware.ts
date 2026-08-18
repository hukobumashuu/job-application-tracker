import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/api-error.js';
import { ApiResponse } from '../utils/api-response.js';

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ApiError) {
    res.status(error.statusCode).json(ApiResponse.error(error.message, error.errors));
    return;
  }

  console.error(error); // swap for a real logger

  res.status(500).json(ApiResponse.error('Internal server error'));
}
