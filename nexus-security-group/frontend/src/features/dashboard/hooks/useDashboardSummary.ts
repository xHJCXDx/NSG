import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth';
import { fetchDashboardSummary } from '../api';

export function useDashboardSummary() {
  const { token, claims } = useAuth();

  return useQuery({
    queryKey: ['dashboard', 'summary', claims.sub],
    queryFn: () => fetchDashboardSummary(token),
    enabled: !!token,
  });
}
