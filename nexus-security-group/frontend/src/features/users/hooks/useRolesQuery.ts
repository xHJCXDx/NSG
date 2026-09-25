import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth';
import { fetchRoles } from '../api';

export function useRolesQuery() {
  const { token } = useAuth();

  return useQuery({
    queryKey: ['roles'],
    queryFn: () => fetchRoles(token),
    enabled: !!token,
  });
}
