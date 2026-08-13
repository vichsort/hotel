import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { rateLimitMiddleware } from '@/shared/middlewares/rateLimit.middleware.js';

describe('RateLimit Middleware', () => {
  let res: Partial<Response>;
  let next: NextFunction;
  let statusSpy: any;
  let jsonSpy: any;
  let setHeaderSpy: any;

  beforeEach(() => {
    jsonSpy = vi.fn();
    statusSpy = vi.fn().mockReturnValue({ json: jsonSpy });
    setHeaderSpy = vi.fn();

    res = {
      status: statusSpy,
      setHeader: setHeaderSpy,
    };
    next = vi.fn();
  });

  it('deve permitir requisições que estejam dentro do limite (max)', () => {
    const req: Partial<Request> = { ip: '10.0.0.1' };
    const middleware = rateLimitMiddleware({ windowMs: 60000, max: 3 });

    middleware(req as Request, res as Response, next);
    middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(statusSpy).not.toHaveBeenCalled();
  });

  it('deve bloquear e retornar status 429 com Retry-After se o limite de requisições for ultrapassado', () => {
    const req: Partial<Request> = { ip: '10.0.0.2' };
    const middleware = rateLimitMiddleware({ windowMs: 60000, max: 2 });

    middleware(req as Request, res as Response, next); // 1
    middleware(req as Request, res as Response, next); // 2
    middleware(req as Request, res as Response, next); // 3 (ultrapassa)

    expect(next).toHaveBeenCalledTimes(2);
    expect(setHeaderSpy).toHaveBeenCalledWith('Retry-After', expect.any(Number));
    expect(statusSpy).toHaveBeenCalledWith(429);
    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: 'HOTEL_4290_TOO_MANY_REQUESTS',
          message: 'Muitas requisições enviadas em um curto período. Tente novamente em breve.',
        }),
      })
    );
  });
});
