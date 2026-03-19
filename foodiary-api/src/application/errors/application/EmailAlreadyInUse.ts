import { ErrorCode } from "../ErrorCode";
import { ApplicationError } from "./ApplicationError";

export class EmailAlreadyInUse extends ApplicationError {
  public override statusCode = 409;

  public override code: ErrorCode;

  constructor(message?: any, code?: ErrorCode) {
    super();

    this.name = "EmailAlreadyInUse";
    this.message = message ?? "The email address is already in use.";
    this.code = code ?? ErrorCode.EMAIL_ALREADY_IN_USE;
  }
}
