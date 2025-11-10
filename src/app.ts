import express, { Request, Response } from 'express';
import { buildCors } from './middleware/cors.js';
import helmet from 'helmet';
import 'dotenv/config';

import { apiRouter } from './routes/index.js';
import { swaggerUi, swaggerSpec, swaggerUiOptions } from './lib/swagger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { coloredLogger } from './middleware/logger.js';

const app = express();

app.use(helmet());
app.use(buildCors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(coloredLogger);

app.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok', name: 'pos-server' });
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
app.use('/api', apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export { app };
