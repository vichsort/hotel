import { Router } from 'express';
import { EmployeeController } from '@/modules/employee/employee.controller.js';
import { authMiddleware, requireRole } from '@/shared/middlewares/auth.middleware.js';
import { tenantScopeMiddleware } from '@/shared/middlewares/tenantScope.middleware.js';
import { EmployeeRole } from '@prisma/client';

export const employeeRouter = Router();
const controller = new EmployeeController();

employeeRouter.use(authMiddleware, tenantScopeMiddleware);

employeeRouter.get('/', (req, res, next) => {
  controller.list(req, res).catch(next);
});

employeeRouter.get('/:id', (req, res, next) => {
  controller.getById(req, res).catch(next);
});

employeeRouter.post('/', requireRole(EmployeeRole.ADMIN), (req, res, next) => {
  controller.create(req, res).catch(next);
});

employeeRouter.put('/:id', requireRole(EmployeeRole.ADMIN), (req, res, next) => {
  controller.update(req, res).catch(next);
});

employeeRouter.patch('/:id', requireRole(EmployeeRole.ADMIN), (req, res, next) => {
  controller.update(req, res).catch(next);
});

employeeRouter.delete('/:id', requireRole(EmployeeRole.ADMIN), (req, res, next) => {
  controller.delete(req, res).catch(next);
});
