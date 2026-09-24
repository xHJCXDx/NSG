import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth';
import { fetchDashboardSummary } from '../api';
import { usePolling } from '../../../shared/contexts/PollingContext';

export function useDashboardSummary() {
  const { token, claims } = useAuth();
  const { pollingInterval } = usePolling();

  return useQuery({
    queryKey: ['dashboard', 'summary', claims.sub],
    queryFn: () => fetchDashboardSummary(token),
    enabled: !!token,
    refetchInterval: pollingInterval,
  });
}
