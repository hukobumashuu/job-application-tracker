import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ApiError } from '../utils/api-error.js';

type Source = 'body' | 'query' | 'params';

const makeValidator =
  (source: Source) =>
  <T extends z.ZodType>(schema: T) =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return next(ApiError.badRequest(errors));
    }

    req.validated = { ...req.validated, [source]: result.data };
    return next();
  };

export const validate = {
  body: makeValidator('body'),
  query: makeValidator('query'),
  params: makeValidator('params'),
};
