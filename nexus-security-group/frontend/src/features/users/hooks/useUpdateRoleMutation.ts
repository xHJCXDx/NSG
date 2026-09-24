import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth';
import { updateRolePermissions } from '../api';
import type { RoleName, RolePermissionsUpdate } from '../types';

export function useUpdateRoleMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ role, payload }: { role: RoleName; payload: RolePermissionsUpdate }) =>
      updateRolePermissions(token, role, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
    },
  });
}
