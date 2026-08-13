import { Router } from 'express';
import { AuthController } from '@/modules/auth/auth.controller.js';
import { authMiddleware } from '@/shared/middlewares/auth.middleware.js';
import { rateLimitMiddleware } from '@/shared/middlewares/rateLimit.middleware.js';

export const authRouter = Router();
const controller = new AuthController();

const loginLimiter = rateLimitMiddleware({ windowMs: 15 * 60 * 1000, max: 10 });

authRouter.post('/register-hotel', (req, res, next) => {
  controller.registerHotel(req, res).catch(next);
});

authRouter.post('/login', loginLimiter, (req, res, next) => {
  controller.login(req, res).catch(next);
});

authRouter.post('/logout', (req, res, next) => {
  controller.logout(req, res).catch(next);
});

authRouter.get('/me', authMiddleware, (req, res, next) => {
  controller.me(req, res).catch(next);
});
