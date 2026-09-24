import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth';
import { listKeywords } from '../api';

export function useKeywordsQuery() {
  const { token, claims } = useAuth();

  return useQuery({
    queryKey: ['keywords', claims.sub],
    queryFn: () => listKeywords(token),
    enabled: !!token,
  });
}
