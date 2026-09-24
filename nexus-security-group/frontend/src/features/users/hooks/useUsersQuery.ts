import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth';
import { listUsers } from '../api';

export function useUsersQuery() {
  const { token, claims } = useAuth();

  return useQuery({
    queryKey: ['users', claims.sub],
    queryFn: () => listUsers(token),
    enabled: !!token,
  });
}
