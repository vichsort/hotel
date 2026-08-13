import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '@/config/env.js';
import { UnauthorizedError, ForbiddenError } from '@/shared/errors/index.js';
import { AUTH_COOKIE_NAME } from '@/config/constants.js';
import type { UserPayload } from '@/shared/types/express.d.js';
import type { EmployeeRole } from '@prisma/client';

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const token: string | undefined = req.cookies?.[AUTH_COOKIE_NAME];

  if (!token) {
    throw new UnauthorizedError('Token de autenticação não fornecido via cookie seguro.');
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as UserPayload;

    req.user = decoded;
    req.hotelId = decoded.hotelId;

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Sessão expirada. Faça login novamente.');
    }
    throw new UnauthorizedError('Token de autenticação inválido.');
  }
}

export function requireRole(...allowedRoles: EmployeeRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Autenticação necessária.');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError(
        `Acesso negado. Função necessária: [${allowedRoles.join(', ')}].`
      );
    }

    next();
  };
}
