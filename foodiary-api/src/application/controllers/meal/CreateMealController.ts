import { Controller } from "@application/contracts/Controllers";
import { Injectable } from "@kernel/decorators/Injectable";
import KSUID from "ksuid";

@Injectable()
export class CreateMealController extends Controller<CreateMealController.Response> {
  protected override async handle(): Promise<
    Controller.Response<CreateMealController.Response>
  > {
    return {
      statusCode: 201,
      body: {
        mealId: KSUID.randomSync().string,
      },
    };
  }
}

export namespace CreateMealController {
  export type Response = {
    mealId: string;
  };
}
