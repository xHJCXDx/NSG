import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth';
import { createCategory } from '../api';
import type { KeywordCategoryCreatePayload } from '../types';

export function useCreateCategoryMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: KeywordCategoryCreatePayload) => createCategory(token, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keyword-categories'] });
    },
  });
}
