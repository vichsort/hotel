import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '@/shared/errors/AppError.js';
import { ApiResponse } from '@/shared/utils/apiResponse.js';
import { env } from '@/config/env.js';

export const errorMiddleware: ErrorRequestHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json(
      ApiResponse.fail(err.code, err.message, err.details)
    );
    return;
  }

  if (err instanceof ZodError) {
    const issues = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));

    res.status(422).json(
      ApiResponse.fail(
        'HOTEL_4220_VALIDATION_ERROR',
        'Dados da requisição inválidos.',
        { issues }
      )
    );
    return;
  }

  if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400) {
    res.status(400).json(
      ApiResponse.fail(
        'HOTEL_4000_INVALID_JSON',
        'O corpo da requisição contém um JSON inválido ou malformatado.'
      )
    );
    return;
  }

  console.error('[Unhandled Error]', err);

  res.status(500).json(
    ApiResponse.fail(
      'HOTEL_5000_INTERNAL_ERROR',
      'Erro interno no servidor. Tente novamente mais tarde.',
      env.NODE_ENV === 'development' ? { stack: err.stack, name: err.name } : {}
    )
  );
};
