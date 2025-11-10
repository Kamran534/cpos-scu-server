import express, { Request, Response } from 'express';
import { buildCors } from './middleware/cors.js';
import helmet from 'helmet';
import 'dotenv/config';

import { apiRouter } from './routes/index.js';
import { swaggerUi, swaggerSpec, swaggerUiOptions } from './lib/swagger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { coloredLogger } from './middleware/logger.js';
import { sendMessage } from './rabbit/producer.js';
import { consumeMessages } from './rabbit/consumer.js';

const app = express();

app.use(helmet());
app.use(buildCors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(coloredLogger);

void consumeMessages();

app.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok', name: 'pos-server' });
});

app.post('/send', async (req: Request, res: Response) => {
  const { message } = req.body as { message?: string };

  if (!message) {
    return res.status(400).send({ error: 'Message is required' });
  }

  await sendMessage(message);
  return res.send({ status: 'Message sent', message });
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
app.use('/api', apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export { app };
