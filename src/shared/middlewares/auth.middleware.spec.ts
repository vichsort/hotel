import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware, requireRole } from '@/shared/middlewares/auth.middleware.js';
import { UnauthorizedError, ForbiddenError } from '@/shared/errors/index.js';
import { AUTH_COOKIE_NAME } from '@/config/constants.js';
import { env } from '@/config/env.js';
import { EmployeeRole } from '@prisma/client';

describe('Auth Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      cookies: {},
    };
    res = {};
    next = vi.fn();
  });

  describe('authMiddleware', () => {
    it('deve autenticar com sucesso quando um token JWT válido for fornecido no cookie', () => {
      const payload = { id: 'user-123', hotelId: 'hotel-123', role: EmployeeRole.ADMIN };
      const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '1h' });

      req.cookies = { [AUTH_COOKIE_NAME]: token };

      authMiddleware(req as Request, res as Response, next);

      expect(req.user).toBeDefined();
      expect(req.user?.id).toBe('user-123');
      expect(req.hotelId).toBe('hotel-123');
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('deve autenticar com sucesso quando um token JWT válido for fornecido no header Authorization Bearer', () => {
      const payload = { id: 'user-123', hotelId: 'hotel-123', role: EmployeeRole.ADMIN };
      const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '1h' });

      req.headers = { authorization: `Bearer ${token}` };

      authMiddleware(req as Request, res as Response, next);

      expect(req.user).toBeDefined();
      expect(req.user?.id).toBe('user-123');
      expect(req.hotelId).toBe('hotel-123');
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('deve lançar UnauthorizedError se nenhum cookie de auth nem header for enviado', () => {
      req.cookies = {};

      expect(() => authMiddleware(req as Request, res as Response, next)).toThrow(UnauthorizedError);
      expect(next).not.toHaveBeenCalled();
    });

    it('deve lançar UnauthorizedError se o token estiver expirado', () => {
      const payload = { id: 'user-123', hotelId: 'hotel-123', role: EmployeeRole.ADMIN };
      const expiredToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: -10 });

      req.cookies = { [AUTH_COOKIE_NAME]: expiredToken };

      expect(() => authMiddleware(req as Request, res as Response, next)).toThrow(
        'Sessão expirada. Faça login novamente.'
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('deve lançar UnauthorizedError se o token for malformado ou assinado com secret inválida', () => {
      req.cookies = { [AUTH_COOKIE_NAME]: 'token-invalido-123' };

      expect(() => authMiddleware(req as Request, res as Response, next)).toThrow(
        'Token de autenticação inválido.'
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('deve permitir acesso se a função do usuário estiver nas funções permitidas', () => {
      req.user = { id: 'user-123', email: 'carlos@test.com', hotelId: 'hotel-123', role: EmployeeRole.ADMIN };
      const middleware = requireRole(EmployeeRole.ADMIN, EmployeeRole.STAFF);

      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('deve lançar ForbiddenError se o usuário não possuir a função necessária', () => {
      req.user = { id: 'user-123', email: 'carlos@test.com', hotelId: 'hotel-123', role: EmployeeRole.STAFF };
      const middleware = requireRole(EmployeeRole.ADMIN);

      expect(() => middleware(req as Request, res as Response, next)).toThrow(ForbiddenError);
      expect(next).not.toHaveBeenCalled();
    });

    it('deve lançar UnauthorizedError se req.user não estiver definido', () => {
      const middleware = requireRole(EmployeeRole.ADMIN);

      expect(() => middleware(req as Request, res as Response, next)).toThrow(UnauthorizedError);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
