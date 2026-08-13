import { Router } from 'express';
import { RoomTypeController } from '@/modules/room-type/roomType.controller.js';
import { authMiddleware, requireRole } from '@/shared/middlewares/auth.middleware.js';
import { tenantScopeMiddleware } from '@/shared/middlewares/tenantScope.middleware.js';
import { EmployeeRole } from '@prisma/client';

export const roomTypeRouter = Router();
const controller = new RoomTypeController();

roomTypeRouter.use(authMiddleware, tenantScopeMiddleware);

roomTypeRouter.get('/', (req, res, next) => {
  controller.list(req, res).catch(next);
});

roomTypeRouter.get('/:id', (req, res, next) => {
  controller.getById(req, res).catch(next);
});

roomTypeRouter.post('/', requireRole(EmployeeRole.ADMIN), (req, res, next) => {
  controller.create(req, res).catch(next);
});

roomTypeRouter.put('/:id', requireRole(EmployeeRole.ADMIN), (req, res, next) => {
  controller.update(req, res).catch(next);
});

roomTypeRouter.patch('/:id', requireRole(EmployeeRole.ADMIN), (req, res, next) => {
  controller.update(req, res).catch(next);
});

roomTypeRouter.delete('/:id', requireRole(EmployeeRole.ADMIN), (req, res, next) => {
  controller.delete(req, res).catch(next);
});
