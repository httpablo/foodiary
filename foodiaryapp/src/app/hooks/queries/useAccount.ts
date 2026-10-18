import { queryKeys } from '@app/lib/queryKeys';
import { AccountsService } from '@app/services/AccountsService';
import { useQuery } from '@tanstack/react-query';

interface IUseAccountParams {
  enabled?: boolean;
}

export function useAccount(params?: IUseAccountParams) {
  const { data, isLoading, isError, refetch } = useQuery({
    enabled: params?.enabled ?? true,
    queryKey: queryKeys.account(),
    queryFn: () => AccountsService.getMe(),
    staleTime: 30 * 60 * 1000,
  });

  return {
    account: data,
    isLoading,
    isError,
    loadAccount: refetch,
  };
}
