import { config } from './config/env.js';
import { app } from './app.js';

const server = app.listen(config.port, () => {
  console.log(`Server is running in ${config.env} mode on port ${config.port}`);
});

server.on('error', (error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
