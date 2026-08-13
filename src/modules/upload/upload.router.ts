import { Router } from 'express';
import { UploadController } from '@/modules/upload/upload.controller.js';
import { authMiddleware } from '@/shared/middlewares/auth.middleware.js';

export const uploadRouter = Router();
const controller = new UploadController();

uploadRouter.use(authMiddleware);

uploadRouter.post('/signature', (req, res, next) => {
  controller.getSignature(req, res).catch(next);
});

uploadRouter.get('/signature', (req, res, next) => {
  controller.getSignature(req, res).catch(next);
});
