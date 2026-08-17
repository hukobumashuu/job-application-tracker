export class ApiResponse<T = null> {
  public readonly success: boolean;
  public readonly message: string;
  public readonly data: T;
  public readonly errors: unknown[] | null;

  private constructor(success: boolean, data: T, message: string, errors: unknown[] | null = null) {
    this.success = success;
    this.data = data;
    this.message = message;
    this.errors = errors;
  }

  static success<T>(data: T, message = 'Success'): ApiResponse<T> {
    return new ApiResponse(true, data, message);
  }

  static error(message: string, errors: unknown[] | null = null): ApiResponse<null> {
    return new ApiResponse(false, null, message, errors);
  }
}
