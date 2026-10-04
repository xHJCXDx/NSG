import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth';
import { updateRolePermissions } from '../api';
import type { RolePermissionsUpdate } from '../types';

export function useUpdateRoleMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roleId, payload }: { roleId: number; payload: RolePermissionsUpdate }) =>
      updateRolePermissions(token, roleId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });
}
