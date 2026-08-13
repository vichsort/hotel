export interface ApiMeta {
  timestamp: string;
  [key: string]: any;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface ApiResponseEnvelope<T = any> {
  ok: boolean;
  data: T | null;
  error: ApiErrorPayload | null;
  meta: ApiMeta;
}

export class ApiResponse {
  /**
   * Constrói um envelope de resposta de sucesso padronizado (ok: true).
   */
  static success<T>(data: T, meta?: Partial<ApiMeta>): ApiResponseEnvelope<T> {
    return {
      ok: true,
      data,
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    };
  }

  /**
   * Constrói um envelope de resposta de erro padronizado (ok: false).
   */
  static fail(
    code: string,
    message: string,
    details: Record<string, any> = {},
    meta?: Partial<ApiMeta>
  ): ApiResponseEnvelope<null> {
    return {
      ok: false,
      data: null,
      error: {
        code,
        message,
        details,
      },
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    };
  }
}
