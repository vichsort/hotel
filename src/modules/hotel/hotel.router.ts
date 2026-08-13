import { Router } from 'express';
import { HotelController } from '@/modules/hotel/hotel.controller.js';
import { authMiddleware, requireRole } from '@/shared/middlewares/auth.middleware.js';
import { tenantScopeMiddleware } from '@/shared/middlewares/tenantScope.middleware.js';
import { EmployeeRole } from '@prisma/client';

export const hotelRouter = Router();
const controller = new HotelController();

hotelRouter.use(authMiddleware, tenantScopeMiddleware);

hotelRouter.get('/', (req, res, next) => {
  controller.getProfile(req, res).catch(next);
});

hotelRouter.get('/stats', (req, res, next) => {
  controller.getStats(req, res).catch(next);
});

hotelRouter.patch('/', requireRole(EmployeeRole.ADMIN), (req, res, next) => {
  controller.update(req, res).catch(next);
});

hotelRouter.put('/', requireRole(EmployeeRole.ADMIN), (req, res, next) => {
  controller.update(req, res).catch(next);
});
