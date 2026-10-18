import { Controller } from '@application/contracts/Controller';
import { Meal } from '@application/entities/Meal';
import { CreateMealUseCase } from '@application/usecases/meals/CreateMealUseCase';
import { Injectable } from '@kernel/decorators/Injectable';
import { Schema } from '@kernel/decorators/Schema';
import { CreateMealBody, createMealSchema } from './schemas/createMealSchema';

@Injectable([CreateMealUseCase])
@Schema(createMealSchema)
export class CreateMealController extends Controller<'private', CreateMealController.Response> {
  constructor(private readonly createMealUseCase: CreateMealUseCase) {
    super();
  }

  protected override async handle({
    accountId,
    body,
  }: Controller.Request<'private', CreateMealBody>): Promise<Controller.Response<CreateMealController.Response>> {
    const { file, date, timezoneOffsetMinutes } = body;
    const inputType = (
      file.type.startsWith('audio/')
        ? Meal.InputType.AUDIO
        : Meal.InputType.PICTURE
    );

    const { mealId, uploadSignature } = await this.createMealUseCase.execute({
      accountId,
      date,
      timezoneOffsetMinutes,
      file: {
        size: file.size,
        inputType,
        mimeType: file.type,
      },
    });

    return {
      statusCode: 201,
      body: {
        mealId,
        uploadSignature,
      },
    };
  }
}

export namespace CreateMealController {
  export type Response = {
    mealId: string;
    uploadSignature: string;
  }
}
