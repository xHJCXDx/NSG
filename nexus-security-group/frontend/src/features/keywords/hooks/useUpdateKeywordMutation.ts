import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth';
import { updateKeyword } from '../api';
import type { KeywordUpdatePayload } from '../types';

export function useUpdateKeywordMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ keywordId, payload }: { keywordId: number; payload: KeywordUpdatePayload }) =>
      updateKeyword(token, keywordId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keywords'] });
    },
  });
}
