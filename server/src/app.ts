import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './shared/middlewares/error-handler.middleware.js';
import { tenantContext } from './shared/middlewares/tenant-context.middleware.js';
import applicationsRouter from './features/applications/applications.routes.js';

export const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json({ limit: '100kb' }));
app.use(tenantContext);

app.use('/applications', applicationsRouter);

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use(errorHandler);
