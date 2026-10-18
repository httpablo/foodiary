import { APIMeal, APISimplifiedMeal, Food, Meal, SimplifiedMeal } from '@app/types/Meal';
import { env } from '@app/config/env';
import { WeeklySummary } from '@app/types/WeeklySummary';
import { Service } from './Service';

function cloneFoods(foods: Food[] | undefined): Food[] {
  return Array.isArray(foods) ? foods.map(food => ({ ...food })) : [];
}

function parseCreatedAt(value: string | Date): Date {
  return value instanceof Date ? new Date(value.getTime()) : new Date(value);
}

export function mapMealFromAPI(raw: APIMeal): Meal;
export function mapMealFromAPI(raw: APISimplifiedMeal): SimplifiedMeal;
export function mapMealFromAPI(raw: APIMeal | APISimplifiedMeal): Meal | SimplifiedMeal {
  const createdAt = parseCreatedAt(raw.createdAt);
  const foods = cloneFoods(raw.foods);

  if ('inputFileURL' in raw || 'status' in raw || 'inputType' in raw) {
    const fullMeal = raw as APIMeal;
    const inputFileURL = fullMeal.inputFileURL?.startsWith('/')
      ? `${env.api.url.replace(/\/$/, '')}${fullMeal.inputFileURL}`
      : (fullMeal.inputFileURL ?? null);

    return {
      ...fullMeal,
      inputFileURL,
      foods,
      createdAt,
    };
  }

  return {
    ...raw,
    foods,
    createdAt,
  };
}

export class MealsService extends Service {
  static mapMealFromAPI = mapMealFromAPI;

  static async getHistory(cursor?: string): Promise<MealsService.HistoryResponse> {
    const { data } = await this.client.get<MealsService.APIHistoryResponse>('/meals/history', {
      params: { cursor, limit: 20 },
    });
    return {
      ...data,
      meals: data.meals.map(meal => mapMealFromAPI(meal)),
    };
  }

  static async getMealHistory(cursor?: string): Promise<MealsService.HistoryResponse> {
    return this.getHistory(cursor);
  }

  static async getWeeklySummary(startDate: string, timezoneOffsetMinutes: number): Promise<WeeklySummary> {
    const { data } = await this.client.get<WeeklySummary>('/meals/weekly-summary', {
      params: { startDate, timezoneOffsetMinutes },
    });
    return data;
  }

  static async getMealsByDate(date: string, timezoneOffsetMinutes: number): Promise<MealsService.GetMealsByDateResponse> {
    const { data } = await this.client.get<MealsService.APIGetMealsByDateResponse>(
      '/meals',
      {
        params: {
          date,
          timezoneOffsetMinutes,
        },
      },
    );

    return {
      meals: data.meals.map(meal => mapMealFromAPI(meal)),
    };
  }

  static async getMealById(id: string): Promise<MealsService.GetMealByIdResponse> {
    const { data } = await this.client.get<MealsService.APIGetMealByIdResponse>(
      `/meals/${id}`,
    );

    return {
      meal: mapMealFromAPI(data.meal),
    };
  }

  static async createMeal(
    payload: MealsService.CreateMealPayload,
  ): Promise<MealsService.CreateMealResponse> {
    const { blob, ...filePayload } = payload.file;
    const { data } = await this.client.post('/meals', {
      ...payload,
      file: filePayload,
    });

    await this.uploadPresignedPOST({
      uploadSignature: data.uploadSignature,
      file: {
        type: payload.file.type,
        uri: payload.file.uri,
        name: payload.file.name,
        blob,
      },
    });

    return {
      mealId: data.mealId,
    };
  }

  static async updateMeal(id: string, payload: MealsService.UpdateMealPayload): Promise<void> {
    const response = await this.client.patch<{ meal?: APIMeal } | undefined>(`/meals/${id}`, payload);
    if (response?.data?.meal) {
      mapMealFromAPI(response.data.meal);
    }
  }

  static async createManualMeal(payload: MealsService.CreateManualMealPayload): Promise<string> {
    const { data } = await this.client.post<{ mealId: string; meal?: APIMeal }>('/meals/manual', payload);
    if (data.meal) {
      mapMealFromAPI(data.meal);
    }
    return data.mealId;
  }

  static async repeatMeal(id: string, payload: MealsService.UpdateMealPayload): Promise<string> {
    const { data } = await this.client.post<{ mealId: string; meal?: APIMeal }>(`/meals/${id}/repeat`, payload);
    if (data.meal) {
      mapMealFromAPI(data.meal);
    }
    return data.mealId;
  }

  static async deleteMeal(id: string): Promise<void> {
    await this.client.delete(`/meals/${id}`);
  }
}

export namespace MealsService {
  export type APIHistoryResponse = { meals: APISimplifiedMeal[]; nextCursor: string | null };
  export type HistoryResponse = { meals: SimplifiedMeal[]; nextCursor: string | null };
  export type UpdateMealPayload = {
    name: string;
    foods: Pick<Food, 'name' | 'quantity' | 'proteins' | 'carbohydrates' | 'fats'>[];
  };
  export type CreateManualMealPayload = UpdateMealPayload & {
    date: string;
    timezoneOffsetMinutes: number;
  };
  export type APIGetMealsByDateResponse = {
    meals: APISimplifiedMeal[];
  };
  export type GetMealsByDateResponse = {
    meals: SimplifiedMeal[];
  };

  export type MealFileType =
    | 'image/jpeg'
    | 'image/png'
    | 'image/webp'
    | 'audio/m4a'
    | 'audio/mp4'
    | 'audio/webm'
    | 'audio/ogg'
    | 'audio/wav';

  export type CreateMealPayload = {
    file: {
      type: MealFileType;
      size: number;
      uri: string;
      name: string;
      blob?: Blob;
    };
    date?: string;
    timezoneOffsetMinutes?: number;
  };

  export type CreateMealResponse = {
    mealId: string;
  };

  export type APIGetMealByIdResponse = {
    meal: APIMeal;
  };

  export type GetMealByIdResponse = {
    meal: Meal;
  };
}
