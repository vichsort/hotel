import { Router } from 'express';
import { ChatWidgetController } from '@/modules/chat-widget/chatWidget.controller.js';
import { tenantScopeMiddleware } from '@/shared/middlewares/tenantScope.middleware.js';
import { rateLimitMiddleware } from '@/shared/middlewares/rateLimit.middleware.js';

export const chatWidgetRouter = Router();
const controller = new ChatWidgetController();

const chatWidgetLimiter = rateLimitMiddleware({ windowMs: 15 * 60 * 1000, max: 30 });

// Rota pública para listagem de categorias de quarto para o Chat Widget
chatWidgetRouter.get('/room-types', tenantScopeMiddleware, chatWidgetLimiter, (req, res, next) => {
  controller.listRoomTypes(req, res).catch(next);
});

// Rota pública para criação de reservas via Chat Widget (com escopo de hotelId e rate limit)
chatWidgetRouter.post('/', tenantScopeMiddleware, chatWidgetLimiter, (req, res, next) => {
  controller.createOrder(req, res).catch(next);
});
