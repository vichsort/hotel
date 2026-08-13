import { Router } from 'express';
import { HealthController } from '@/modules/health/health.controller.js';

export const healthRouter = Router();
const controller = new HealthController();

healthRouter.get('/health', (req, res, next) => {
  controller.getHealth(req, res).catch(next);
});

healthRouter.get('/health/liveness', (req, res, next) => {
  controller.getLiveness(req, res).catch(next);
});

healthRouter.get('/health/readiness', (req, res, next) => {
  controller.getReadiness(req, res).catch(next);
});
