import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth';
import { listUsers } from '../api';

export function useUsersQuery() {
  const { token } = useAuth();

  return useQuery({
    queryKey: ['users'],
    queryFn: () => listUsers(token),
    enabled: !!token,
  });
}
