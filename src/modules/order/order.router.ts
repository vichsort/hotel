import { Router } from 'express';
import { OrderController } from '@/modules/order/order.controller.js';
import { authMiddleware, requireRole } from '@/shared/middlewares/auth.middleware.js';
import { tenantScopeMiddleware } from '@/shared/middlewares/tenantScope.middleware.js';
import { EmployeeRole } from '@prisma/client';

export const orderRouter = Router();
const controller = new OrderController();

// Todas as rotas de order exigem autenticação de funcionário e escopo do hotel
orderRouter.use(authMiddleware, tenantScopeMiddleware);

orderRouter.get('/', (req, res, next) => {
  controller.list(req, res).catch(next);
});

orderRouter.get('/:id', (req, res, next) => {
  controller.getById(req, res).catch(next);
});

orderRouter.post('/manual', (req, res, next) => {
  controller.createManual(req, res).catch(next);
});

orderRouter.post('/', (req, res, next) => {
  controller.createManual(req, res).catch(next);
});

orderRouter.post('/csv-import', (req, res, next) => {
  controller.importCsv(req, res).catch(next);
});

orderRouter.patch('/:id/status', (req, res, next) => {
  controller.updateStatus(req, res).catch(next);
});

orderRouter.put('/:id/status', (req, res, next) => {
  controller.updateStatus(req, res).catch(next);
});

orderRouter.delete('/:id', requireRole(EmployeeRole.ADMIN), (req, res, next) => {
  controller.delete(req, res).catch(next);
});
