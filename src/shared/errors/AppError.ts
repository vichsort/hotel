export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details: Record<string, any>;

  constructor(
    message: string,
    code: string = 'HOTEL_4000_DOMAIN_ERROR',
    statusCode: number = 400,
    details: Record<string, any> = {}
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
