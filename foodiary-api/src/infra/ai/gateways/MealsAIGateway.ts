import OpenAI, { toFile } from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';

import { Meal } from '@application/entities/Meal';
import { foodInputSchema, mealNameSchema, normalizeFoods } from '@application/shared/foodSchema';
import { LocalMealsFileStorageGateway } from '@infra/gateways/LocalMealsFileStorageGateway';
import { Injectable } from '@kernel/decorators/Injectable';
import { ChatCompletionContentPart } from 'openai/resources/index';
import z from 'zod';
import { getImagePrompt } from '../prompts/getImagePrompt';
import { getTextPrompt } from '../prompts/getTextPrompt';

const openAIMealSchema = z.object({
  name: z.string(),
  icon: z.string(),
  foods: z.array(z.object({
    name: z.string(),
    quantity: z.string(),
    calories: z.number(),
    carbohydrates: z.number(),
    fats: z.number(),
    proteins: z.number(),
  })),
});

const aiMealResultSchema = z.object({
  name: mealNameSchema,
  icon: z.string().trim().min(1).max(32),
  foods: z.array(foodInputSchema).min(1).max(50),
});

@Injectable([LocalMealsFileStorageGateway])
export class MealsAIGateway {
  constructor(private readonly mealsFileStorageGateway: LocalMealsFileStorageGateway) { }

  private client: OpenAI | undefined;

  static validateAndNormalizeResult(mealId: string, raw: unknown): MealsAIGateway.ProcessMealResult {
    const parsed = aiMealResultSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`Invalid analysis returned for meal "${mealId}".`);
    }

    return {
      name: parsed.data.name,
      icon: parsed.data.icon,
      foods: normalizeFoods(parsed.data.foods),
    };
  }

  private getClient(): OpenAI {
    this.client ??= new OpenAI();
    return this.client;
  }

  async processMeal(meal: Meal): Promise<MealsAIGateway.ProcessMealResult> {
    if (!meal.inputFileKey || meal.inputType === Meal.InputType.MANUAL) {
      throw new Error('Only uploaded meals can be processed.');
    }
    const mealFile = await this.mealsFileStorageGateway.read(meal.inputFileKey);
    const ext = LocalMealsFileStorageGateway.getFileExtension(meal.inputFileKey)
      || (meal.inputType === Meal.InputType.AUDIO ? 'm4a' : 'jpeg');
    const mimeType = LocalMealsFileStorageGateway.getMimeTypeFromFileKey(meal.inputFileKey, meal.inputType);

    if (meal.inputType === Meal.InputType.PICTURE) {
      return this.callAI({
        mealId: meal.id,
        systemPrompt: getImagePrompt(),
        userMessageParts: [
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${mealFile.toString('base64')}`,
              detail: 'high',
            },
          },
          {
            type: 'text',
            text: `Meal date: ${meal.createdAt}`,
          },
        ],
      });
    }

    const transcription = await this.transcribe(mealFile, ext, mimeType);

    return this.callAI({
      mealId: meal.id,
      systemPrompt: getTextPrompt(),
      userMessageParts: `Meal date: ${meal.createdAt}\n\nMeal: ${transcription}`,
    });
  }

  private async callAI({
    mealId,
    systemPrompt,
    userMessageParts,
  }: MealsAIGateway.CallAIParams): Promise<MealsAIGateway.ProcessMealResult> {
    const response = await this.getClient().chat.completions.create({
      model: 'gpt-4.1-mini',
      response_format: zodResponseFormat(openAIMealSchema, 'meal'),
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userMessageParts,
        },
      ],
    });

    const json = response.choices[0]?.message.content;

    if (!json) {
      throw new Error(`No analysis returned for meal "${mealId}".`);
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(json);
    } catch {
      throw new Error(`Invalid analysis returned for meal "${mealId}".`);
    }

    return MealsAIGateway.validateAndNormalizeResult(mealId, parsedJson);
  }

  private async transcribe(audioFile: Buffer, ext = 'm4a', mimeType = 'audio/m4a') {
    const { text } = await this.getClient().audio.transcriptions.create({
      model: 'gpt-4o-mini-transcribe',
      file: await toFile(audioFile, `audio.${ext}`, { type: mimeType }),
    });

    return text;
  }
}

export namespace MealsAIGateway {
  export type ProcessMealResult = {
    name: string;
    icon: string;
    foods: Meal.Food[];
  }

  export type CallAIParams = {
    mealId: string;
    systemPrompt: string;
    userMessageParts: string | ChatCompletionContentPart[];
  }
}
