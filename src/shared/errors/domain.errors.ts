import { AppError } from './AppError.js';

export class NotFoundError extends AppError {
  constructor(resource: string = 'Recurso', id?: string) {
    const message = id ? `${resource} com ID '${id}' não encontrado.` : `${resource} não encontrado.`;
    super(message, 'HOTEL_4004_NOT_FOUND', 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflito com o estado atual do recurso.') {
    super(message, 'HOTEL_4009_CONFLICT', 409);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Dados da requisição inválidos.', details: Record<string, any> = {}) {
    super(message, 'HOTEL_4220_VALIDATION_ERROR', 422, details);
  }
}

export class RoomUnavailableError extends AppError {
  constructor(roomNumber?: string) {
    const message = roomNumber
      ? `O quarto '${roomNumber}' não está disponível para o período selecionado.`
      : 'Quarto indisponível para o período selecionado.';
    super(message, 'HOTEL_4009_ROOM_UNAVAILABLE', 409);
  }
}

export class InvalidStatusTransitionError extends AppError {
  constructor(fromStatus: string, toStatus: string) {
    super(
      `Não é possível alterar o status do pedido de '${fromStatus}' para '${toStatus}'.`,
      'HOTEL_4000_INVALID_STATUS_TRANSITION',
      400,
      { fromStatus, toStatus }
    );
  }
}
