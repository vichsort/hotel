import { Router } from 'express';
import { healthRouter } from '@/modules/health/health.router.js';
import { authRouter } from '@/modules/auth/auth.router.js';
import { hotelRouter } from '@/modules/hotel/hotel.router.js';
import { employeeRouter } from '@/modules/employee/employee.router.js';
import { roomTypeRouter } from '@/modules/room-type/roomType.router.js';
import { roomRouter } from '@/modules/room/room.router.js';
import { guestRouter } from '@/modules/guest/guest.router.js';
import { orderRouter } from '@/modules/order/order.router.js';
import { chatWidgetRouter } from '@/modules/chat-widget/chatWidget.router.js';
import { uploadRouter } from '@/modules/upload/upload.router.js';
import { NotFoundError } from '@/shared/errors/index.js';

export const router = Router();

// Módulo de Health Check e Monitoramento de Integridade
router.use(healthRouter);

// Módulo de Autenticação
router.use('/auth', authRouter);

// Módulo de Gestão do Hotel & Estatísticas do Painel
router.use('/hotel', hotelRouter);

// Módulo de Funcionários
router.use('/employees', employeeRouter);

// Módulo de Categorias de Acomodação
router.use('/room-types', roomTypeRouter);

// Módulo de Quartos Físicos
router.use('/rooms', roomRouter);

// Módulo de Hóspedes
router.use('/guests', guestRouter);

// Módulo Público do Chatbot Widget (suporte às rotas /chat-widget e /orders/chat-widget)
router.use('/chat-widget', chatWidgetRouter);
router.use('/orders/chat-widget', chatWidgetRouter);

// Módulo Principal de Pedidos e Reservas Internas
router.use('/orders', orderRouter);

// Módulo de Assinatura de Upload (Cloudinary)
router.use('/upload', uploadRouter);

// Tratamento de rotas inexistentes (404 Not Found em Express 5)
router.use((req, _res, next) => {
  next(new NotFoundError('Rota', req.originalUrl));
});
