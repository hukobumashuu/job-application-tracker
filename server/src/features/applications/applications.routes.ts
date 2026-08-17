import { Router } from 'express';
import * as ApplicationController from './applications.controller.js';
import { validate } from '../../shared/middlewares/validate.middleware.js';
import {
  applicationIdParamSchema,
  createApplicationSchema,
  updateApplicationSchema,
  bulkCreateApplicationSchema,
} from './applications.validation.js';
import { paginationQuerySchema } from '../../shared/utils/pagination.js';

const router = Router();

router.get('/', validate.query(paginationQuerySchema), ApplicationController.getApplications);

router.post('/', validate.body(createApplicationSchema), ApplicationController.createApplication);

router.post(
  '/bulk',
  validate.body(bulkCreateApplicationSchema),
  ApplicationController.createManyApplications
);

router.patch(
  '/:id',
  validate.params(applicationIdParamSchema),
  validate.body(updateApplicationSchema),
  ApplicationController.updateApplication
);

router.delete(
  '/:id',
  validate.params(applicationIdParamSchema),
  ApplicationController.deleteApplication
);

export default router;
