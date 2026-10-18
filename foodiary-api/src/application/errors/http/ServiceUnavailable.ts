import { ErrorCode } from '../ErrorCode';
import { HttpError } from './HttpError';

export class ServiceUnavailable extends HttpError {
  public override statusCode = 503;

  public override code: ErrorCode;

  constructor(message?: any, code?: ErrorCode) {
    super();

    this.name = 'ServiceUnavailable';
    this.message = message ?? 'Service Unavailable';
    this.code = code ?? ErrorCode.SERVICE_UNAVAILABLE;
  }
}
