import { useQuery } from '@tanstack/react-query';
import { fetchHealth } from '../api';

export function useHealthQuery() {
  return useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    staleTime: 30_000,
  });
}
