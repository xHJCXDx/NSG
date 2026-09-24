import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth';
import { listAlerts } from '../api';
import type { AlertsQuery } from '../types';

export function useAlertsQuery(query: AlertsQuery) {
  const { token, claims } = useAuth();

  return useQuery({
    queryKey: ['alerts', claims.sub, query],
    queryFn: () => listAlerts(token, query),
    enabled: !!token,
  });
}
