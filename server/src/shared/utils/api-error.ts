export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errors: unknown[] | null;

  constructor(message: string | unknown[], statusCode: number) {
    super(typeof message === 'string' ? message : 'Validation Error');
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.isOperational = true;
    this.errors = typeof message === 'string' ? null : message;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(msg: string | unknown[]) {
    return new ApiError(msg, 400);
  }

  static unauthorized(msg: string | unknown[]) {
    return new ApiError(msg, 401);
  }

  static forbidden(msg: string | unknown[]) {
    return new ApiError(msg, 403);
  }

  static notFound(msg: string | unknown[]) {
    return new ApiError(msg, 404);
  }

  static conflict(msg: string | unknown[]) {
    return new ApiError(msg, 409);
  }
}
