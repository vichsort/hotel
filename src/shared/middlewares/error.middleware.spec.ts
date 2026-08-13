import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { ZodError, z } from 'zod';
import { errorMiddleware } from '@/shared/middlewares/error.middleware.js';
import { NotFoundError } from '@/shared/errors/domain.errors.js';

describe('Error Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let statusSpy: any;
  let jsonSpy: any;

  beforeEach(() => {
    jsonSpy = vi.fn();
    statusSpy = vi.fn().mockReturnValue({ json: jsonSpy });
    req = {};
    res = {
      status: statusSpy,
    };
    next = vi.fn();
  });

  it('deve responder com o statusCode e o formato do AppError quando um AppError for lançado', () => {
    const error = new NotFoundError('Reserva', 'order-123');

    errorMiddleware(error, req as Request, res as Response, next);

    expect(statusSpy).toHaveBeenCalledWith(404);
    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: false,
        data: null,
        error: expect.objectContaining({
          code: 'HOTEL_4004_NOT_FOUND',
          message: "Reserva com ID 'order-123' não encontrado.",
        }),
      })
    );
  });

  it('deve responder com status 422 e mapa de erros quando for um ZodError', () => {
    const schema = z.object({ name: z.string().min(3) });
    let zodError: ZodError;

    try {
      schema.parse({ name: 'ab' });
      throw new Error('Não deveria passar');
    } catch (err: any) {
      zodError = err;
    }

    errorMiddleware(zodError!, req as Request, res as Response, next);

    expect(statusSpy).toHaveBeenCalledWith(422);
    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: false,
        data: null,
        error: expect.objectContaining({
          code: 'HOTEL_4220_VALIDATION_ERROR',
          message: 'Dados da requisição inválidos.',
        }),
      })
    );
  });

  it('deve responder com status 400 em caso de erro de sintaxe JSON no body', () => {
    const syntaxErr = new SyntaxError('Unexpected token in JSON');
    (syntaxErr as any).status = 400;

    errorMiddleware(syntaxErr, req as Request, res as Response, next);

    expect(statusSpy).toHaveBeenCalledWith(400);
    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: false,
        data: null,
        error: expect.objectContaining({
          code: 'HOTEL_4000_INVALID_JSON',
        }),
      })
    );
  });

  it('deve responder com status 500 para erros desconhecidos', () => {
    const genericErr = new Error('Erro misterioso no banco');

    errorMiddleware(genericErr, req as Request, res as Response, next);

    expect(statusSpy).toHaveBeenCalledWith(500);
    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: false,
        data: null,
        error: expect.objectContaining({
          code: 'HOTEL_5000_INTERNAL_ERROR',
        }),
      })
    );
  });
});
