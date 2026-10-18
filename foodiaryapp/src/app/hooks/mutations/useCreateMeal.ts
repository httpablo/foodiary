import { getFileInfo } from '@app/lib/getFileInfo';
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
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['meals'] }),
        queryClient.invalidateQueries({ queryKey: ['weeklySummary'] }),
        queryClient.invalidateQueries({ queryKey: ['mealHistory'] }),
      ]);
    },
  });

  return {
    createMeal: mutateAsync,
    isLoading: isPending,
    createdMealId: data?.mealId,
  };
}
