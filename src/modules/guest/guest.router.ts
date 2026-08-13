import { Router } from 'express';
import { GuestController } from '@/modules/guest/guest.controller.js';
import { authMiddleware, requireRole } from '@/shared/middlewares/auth.middleware.js';
import { tenantScopeMiddleware } from '@/shared/middlewares/tenantScope.middleware.js';
import { EmployeeRole } from '@prisma/client';

export const guestRouter = Router();
const controller = new GuestController();

guestRouter.use(authMiddleware, tenantScopeMiddleware);

guestRouter.get('/', (req, res, next) => {
  controller.list(req, res).catch(next);
});

guestRouter.get('/:id', (req, res, next) => {
  controller.getById(req, res).catch(next);
});

guestRouter.post('/', (req, res, next) => {
  controller.create(req, res).catch(next);
});

guestRouter.put('/:id', (req, res, next) => {
  controller.update(req, res).catch(next);
});

guestRouter.patch('/:id', (req, res, next) => {
  controller.update(req, res).catch(next);
});

guestRouter.delete('/:id', requireRole(EmployeeRole.ADMIN), (req, res, next) => {
  controller.delete(req, res).catch(next);
});
