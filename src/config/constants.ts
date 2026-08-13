import { env } from '@/config/env.js';
import { OrderStatus } from '@prisma/client';

export const AUTH_COOKIE_NAME = 'access_token';

/**
 * Opções de Cookie HTTP padronizadas para autenticação (8h de validade conforme Rules Card)
 */
export function getAuthCookieOptions() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 8 * 60 * 60 * 1000, // 8 horas
    path: '/',
  };
}

/**
 * Máquina de estados das transições válidas de reservas
 */
export const VALID_ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.CHECKED_IN, OrderStatus.CANCELLED],
  [OrderStatus.CHECKED_IN]: [OrderStatus.CHECKED_OUT],
  [OrderStatus.CHECKED_OUT]: [],
  [OrderStatus.CANCELLED]: [],
};
