import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth';
import { listExecutionLogs } from '../api';
import type { ExecutionLogsQuery } from '../types';

export function useExecutionLogsQuery(query: ExecutionLogsQuery) {
  const { token, claims } = useAuth();

  return useQuery({
    queryKey: ['execution-logs', claims.sub, query],
    queryFn: () => listExecutionLogs(token, query),
    enabled: !!token,
  });
}
