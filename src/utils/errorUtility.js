export class AppError extends Error {
  constructor(message, statusCode = 500, meta = {}) {
    super(message);
    this.statusCode = statusCode;
    this.meta = meta;
    this.isOperational = true;
  }
}
