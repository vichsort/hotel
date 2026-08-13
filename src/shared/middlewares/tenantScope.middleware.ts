import type { Request, Response, NextFunction } from 'express';
import { TenantRequiredError } from '@/shared/errors/index.js';

export function tenantScopeMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const hotelId =
    req.user?.hotelId ||
    (req.headers['x-hotel-id'] as string) ||
    (req.query.hotelId as string) ||
    (req.body && req.body.hotelId);

  if (!hotelId || typeof hotelId !== 'string' || hotelId.trim() === '') {
    throw new TenantRequiredError(
      'O identificador do hotel (hotelId) é obrigatório para esta operação.'
    );
  }

  req.hotelId = hotelId.trim();
  next();
}
