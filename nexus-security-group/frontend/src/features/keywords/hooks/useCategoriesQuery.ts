import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth';
import { listCategories } from '../api';

export function useCategoriesQuery() {
  const { token, claims } = useAuth();

  return useQuery({
    queryKey: ['keyword-categories', claims.sub],
    queryFn: () => listCategories(token),
    enabled: !!token,
  });
}
