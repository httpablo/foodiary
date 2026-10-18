import { ErrorCode } from '../ErrorCode';
import { HttpError } from './HttpError';

export class TooManyRequests extends HttpError {
  public override statusCode = 429;

  public override code: ErrorCode;

  constructor(message?: any, code?: ErrorCode) {
    super();

    this.name = 'TooManyRequests';
    this.message = message ?? 'Too Many Requests';
    this.code = code ?? ErrorCode.TOO_MANY_REQUESTS;
  }
}
