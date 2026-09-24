import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth';
import { fetchPermissions } from '../api';

export function usePermissionsQuery() {
  const { token, claims } = useAuth();

  return useQuery({
    queryKey: ['permissions', claims?.sub],
    queryFn: () => fetchPermissions(token),
    enabled: !!token,
  });
}
