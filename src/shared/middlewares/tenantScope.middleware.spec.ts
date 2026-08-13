import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { tenantScopeMiddleware } from '@/shared/middlewares/tenantScope.middleware.js';
import { TenantRequiredError } from '@/shared/errors/index.js';

describe('TenantScope Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      headers: {},
      query: {},
      body: {},
    };
    res = {};
    next = vi.fn();
  });

  it('deve priorizar o hotelId do req.user quando o usuário estiver autenticado', () => {
    req.user = { id: 'user-1', email: 'user@test.com', hotelId: 'hotel-user', role: 'ADMIN' as any };
    req.headers = { 'x-hotel-id': 'hotel-header' };

    tenantScopeMiddleware(req as Request, res as Response, next);

    expect(req.hotelId).toBe('hotel-user');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('deve extrair hotelId do header x-hotel-id se req.user não estiver presente', () => {
    req.headers = { 'x-hotel-id': 'hotel-header-123' };

    tenantScopeMiddleware(req as Request, res as Response, next);

    expect(req.hotelId).toBe('hotel-header-123');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('deve extrair hotelId de req.query se header e user não estiverem presentes', () => {
    req.query = { hotelId: 'hotel-query-123' };

    tenantScopeMiddleware(req as Request, res as Response, next);

    expect(req.hotelId).toBe('hotel-query-123');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('deve extrair hotelId de req.body se outras fontes não estiverem presentes', () => {
    req.body = { hotelId: 'hotel-body-123' };

    tenantScopeMiddleware(req as Request, res as Response, next);

    expect(req.hotelId).toBe('hotel-body-123');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('deve lançar TenantRequiredError se hotelId for ausente ou vazio', () => {
    req.body = {};

    expect(() => tenantScopeMiddleware(req as Request, res as Response, next)).toThrow(TenantRequiredError);
    expect(next).not.toHaveBeenCalled();
  });
});
