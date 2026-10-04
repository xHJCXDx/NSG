import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth';
import { reactivateUser } from '../api';

export function useReactivateUserMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: number) => reactivateUser(token, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
