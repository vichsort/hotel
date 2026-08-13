import type { Request, Response, NextFunction } from 'express';

const requestCounts = new Map<string, { count: number; resetTime: number }>();

/**
 * Middleware in-memory de rate-limiting leve para proteção de rotas públicas/sensíveis
 */
export function rateLimitMiddleware(options = { windowMs: 15 * 60 * 1000, max: 100 }) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    const record = requestCounts.get(ip) || { count: 0, resetTime: now + options.windowMs };

    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + options.windowMs;
    } else {
      record.count += 1;
    }

    requestCounts.set(ip, record);

    if (record.count > options.max) {
      res.setHeader('Retry-After', Math.ceil((record.resetTime - now) / 1000));
      res.status(429).json({
        ok: false,
        data: null,
        error: {
          code: 'HOTEL_4290_TOO_MANY_REQUESTS',
          message: 'Muitas requisições enviadas em um curto período. Tente novamente em breve.',
          details: { retryAfterSeconds: Math.ceil((record.resetTime - now) / 1000) },
        },
        meta: { timestamp: new Date().toISOString() },
      });
      return;
    }

    next();
  };
}
