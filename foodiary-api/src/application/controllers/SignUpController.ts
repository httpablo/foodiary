import { Controller } from "@application/contracts/Controllers";
import { SignUpUseCase } from "@application/usecases/auth/SignUpUseCase";
import { Injectable } from "@kernel/decorators/Injectable";
import { Schema } from "@kernel/decorators/Schema";
import { SignUpBody, signUpSchema } from "./auth/schemas/SignUpSchema";

@Injectable()
@Schema(signUpSchema)
export class SignUpController extends Controller<SignUpController.Response> {
  constructor(private readonly signUpUseCase: SignUpUseCase) {
    super();
  }

  protected override async handle({
    body,
  }: Controller.Request<SignUpBody>): Promise<
    Controller.Response<SignUpController.Response>
  > {
    const { account } = body;
    const { accessToken, refreshToken } =
      await this.signUpUseCase.execute(account);
    return {
      statusCode: 201,
      body: {
        accessToken,
        refreshToken,
      },
    };
  }
}

export namespace SignUpController {
  export type Response = {
    accessToken: string;
    refreshToken: string;
  };
}
