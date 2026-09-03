import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth';
import { fetchDashboardSummary } from '../api';

export function useDashboardSummary() {
  const { token } = useAuth();

  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => fetchDashboardSummary(token),
    enabled: !!token,
  });
}
