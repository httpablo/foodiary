import { queryClient } from '@app/lib/queryClient';
import { queryKeys } from '@app/lib/queryKeys';
import { AchievementsService } from '@app/services/AchievementsService';
import { AchievementCode } from '@app/types/Achievement';
import { useMutation } from '@tanstack/react-query';

export function useAcknowledgeAchievements() {
  const { mutateAsync, isPending } = useMutation({
    mutationFn: (codes: AchievementCode[]) => AchievementsService.acknowledge(codes),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.achievements() }),
  });

  return { acknowledgeAchievements: mutateAsync, isAcknowledging: isPending };
}
