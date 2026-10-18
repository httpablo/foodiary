import { getFileInfo } from '@app/lib/getFileInfo';
import { invalidateMealQueries } from '@app/lib/queryKeys';
import { MealsService } from '@app/services/MealsService';
import { formatDateToAPI } from '@ui/utils/formatDateToAPI';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export type CreateMealInput =
  | string
  | {
      uri: string;
      date?: Date | string;
      timezoneOffsetMinutes?: number;
    };

export function useCreateMeal() {
  const queryClient = useQueryClient();

  const { mutateAsync, isPending, data } = useMutation({
    mutationFn: async (input: CreateMealInput) => {
      const fileUri = typeof input === 'string' ? input : input.uri;
      const rawDate = typeof input === 'string' ? undefined : input.date;
      const formattedDate = rawDate instanceof Date ? formatDateToAPI(rawDate) : rawDate;
      const timezoneOffsetMinutes = typeof input === 'string'
        ? undefined
        : input.timezoneOffsetMinutes ?? (rawDate instanceof Date ? rawDate.getTimezoneOffset() : undefined);

      const { size, type, filename, blob } = await getFileInfo(fileUri);

      const { mealId } = await MealsService.createMeal({
        file: {
          size,
          type,
          name: filename,
          uri: fileUri,
          blob,
        },
        ...(formattedDate !== undefined ? { date: formattedDate } : {}),
        ...(timezoneOffsetMinutes !== undefined ? { timezoneOffsetMinutes } : {}),
      });

      return { mealId };
    },
    onSuccess: async (result) => {
      await invalidateMealQueries(queryClient, result.mealId);
    },
  });

  return {
    createMeal: mutateAsync,
    isLoading: isPending,
    createdMealId: data?.mealId,
  };
}
