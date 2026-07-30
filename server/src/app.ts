import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

export const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json({ limit: '100kb' }));

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});
