import express, { type Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { corsOptions } from '@/config/cors.js';
import { router } from '@/router/index.js';
import { errorMiddleware } from '@/shared/middlewares/error.middleware.js';

export function createApp(): Application {
  const app = express();

  // Permite que o Express identifique conexões HTTPS através do proxy do Railway
  app.set('trust proxy', 1);

  // Middlewares essenciais de segurança, cookies e parsing de payload
  app.use(helmet());
  app.use(cors(corsOptions));
  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Agrupamento de rotas
  app.use('/api', router);
  app.use('/', router);

  // Middleware global de tratamento de erros (deve ser o último app.use)
  app.use(errorMiddleware);

  return app;
}
