import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth';
import { createKeyword } from '../api';
import type { KeywordCreatePayload } from '../types';

export function useCreateKeywordMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: KeywordCreatePayload) => createKeyword(token, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keywords'] });
    },
  });
}
