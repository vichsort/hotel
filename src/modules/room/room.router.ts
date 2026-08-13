import { Router } from 'express';
import { RoomController } from '@/modules/room/room.controller.js';
import { authMiddleware, requireRole } from '@/shared/middlewares/auth.middleware.js';
import { tenantScopeMiddleware } from '@/shared/middlewares/tenantScope.middleware.js';
import { EmployeeRole } from '@prisma/client';

export const roomRouter = Router();
const controller = new RoomController();

roomRouter.use(authMiddleware, tenantScopeMiddleware);

// Leitura pública interna para funcionários autenticados
roomRouter.get('/', (req, res, next) => {
  controller.list(req, res).catch(next);
});

roomRouter.get('/:id', (req, res, next) => {
  controller.getById(req, res).catch(next);
});

// Governança: Rota dedicada para atualização rápida do status operacional (limpeza/manutenção) por qualquer funcionário
roomRouter.patch('/:id/status', (req, res, next) => {
  controller.updateStatus(req, res).catch(next);
});

// Operações estruturais restritas a administradores (ADMIN)
roomRouter.post('/', requireRole(EmployeeRole.ADMIN), (req, res, next) => {
  controller.create(req, res).catch(next);
});

roomRouter.put('/:id', requireRole(EmployeeRole.ADMIN), (req, res, next) => {
  controller.update(req, res).catch(next);
});

roomRouter.patch('/:id', requireRole(EmployeeRole.ADMIN), (req, res, next) => {
  controller.update(req, res).catch(next);
});

roomRouter.delete('/:id', requireRole(EmployeeRole.ADMIN), (req, res, next) => {
  controller.delete(req, res).catch(next);
});
