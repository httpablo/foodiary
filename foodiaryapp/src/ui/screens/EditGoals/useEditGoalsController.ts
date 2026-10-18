import { useUpdateGoals } from '@app/hooks/mutations/useUpdateGoals';
import { useAccount } from '@app/hooks/queries/useAccount';
import { zodResolver } from '@hookform/resolvers/zod';
import { useConfirmDialog } from '@ui/components/ConfirmDialog';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { editGoalsSchema, EditGoalsSchema } from './schema';

export interface IGoalsFeedback {
  type: 'success' | 'error';
  message: string;
}

export function useEditGoalsController() {
  const { top, bottom } = useSafeAreaInsets();
  const { account } = useAccount();
  const { updateGoals, isLoading } = useUpdateGoals();
  const { alert } = useConfirmDialog();
  const [feedback, setFeedback] = useState<IGoalsFeedback | null>(null);

  const form = useForm<EditGoalsSchema>({
    resolver: zodResolver(editGoalsSchema),
    defaultValues: {
      calories: String(account?.goal.calories ?? ''),
      carbohydrates: String(account?.goal.carbohydrates ?? ''),
      proteins: String(account?.goal.proteins ?? ''),
      fats: String(account?.goal.fats ?? ''),
    },
  });
  const hasLoadedDefaults = useRef(!!account);

  useEffect(() => {
    if (!hasLoadedDefaults.current && account) {
      form.reset({
        calories: String(account.goal.calories),
        carbohydrates: String(account.goal.carbohydrates),
        proteins: String(account.goal.proteins),
        fats: String(account.goal.fats),
      });
      hasLoadedDefaults.current = true;
    }
  }, [account, form.reset]);

  const handleSubmit = form.handleSubmit(async (data) => {
    setFeedback(null);
    try {
      await updateGoals({
        calories: Number(data.calories),
        carbohydrates: Number(data.carbohydrates),
        proteins: Number(data.proteins),
        fats: Number(data.fats),
      });

      const message = 'Metas atualizadas com sucesso.';
      setFeedback({ type: 'success', message });
      void alert({ title: 'Sucesso!', message });
    } catch {
      const message = 'Não foi possível atualizar as metas.';
      setFeedback({ type: 'error', message });
      void alert({ title: 'Erro', message });
    }
  });

  return {
    top,
    bottom,
    form,
    feedback,
    handleSubmit,
    isSubmitting: form.formState.isSubmitting || isLoading,
  };
}
