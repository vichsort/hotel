import { AppError } from './AppError.js';

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Autenticação necessária.') {
    super(message, 'HOTEL_4001_UNAUTHORIZED', 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Acesso negado para este recurso.') {
    super(message, 'HOTEL_4003_FORBIDDEN', 403);
  }
}

export class InvalidCredentialsError extends AppError {
  constructor(message: string = 'E-mail ou senha incorretos.') {
    super(message, 'HOTEL_4000_WRONG_CREDENTIALS', 400);
  }
}

export class EmailAlreadyInUseError extends AppError {
  constructor(message: string = 'O e-mail informado já está em uso neste hotel.') {
    super(message, 'HOTEL_4009_EMAIL_IN_USE', 409);
  }
}

export class TenantRequiredError extends AppError {
  constructor(message: string = 'Identificador do hotel (hotelId) não informado ou inválido.') {
    super(message, 'HOTEL_4001_TENANT_REQUIRED', 401);
  }
}
