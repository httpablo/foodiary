import { Controller } from "@application/contracts/Controllers";
import { HelloBody, helloSchema } from "./schemas/helloSchema";
import { Schema } from "@kernel/decorators/Schema";

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
