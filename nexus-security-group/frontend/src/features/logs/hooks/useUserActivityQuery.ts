import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth';
import { listUserActivity } from '../api';
import type { UserActivityQuery } from '../types';

export function useUserActivityQuery(query: UserActivityQuery) {
  const { token, claims } = useAuth();

  return useQuery({
    queryKey: ['user-activity', claims.sub, query],
    queryFn: () => listUserActivity(token, query),
    enabled: !!token,
  });
}
