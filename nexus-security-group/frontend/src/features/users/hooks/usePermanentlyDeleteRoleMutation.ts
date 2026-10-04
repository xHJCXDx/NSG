import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth';
import { permanentlyDeleteRole } from '../api';

export function usePermanentlyDeleteRoleMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roleId: number) => permanentlyDeleteRole(token, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
    },
  });
}
