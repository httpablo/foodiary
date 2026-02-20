import { Schema } from "../../kernel/decorators/Schema";
import { Controller } from "../contracts/Controllers";
import { HelloBody, helloSchema } from "./schemas/helloSchema";

@Schema(helloSchema)
export class HelloController extends Controller<unknown> {
  protected override async handle(
    request: Controller.Request<HelloBody>,
  ): Promise<Controller.Response<unknown>> {
    return {
      statusCode: 200,
      body: {
        parsedBody: request.body,
      },
    };
  }
}
