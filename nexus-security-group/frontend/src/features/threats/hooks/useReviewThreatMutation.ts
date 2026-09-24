import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth';
import { reviewThreat } from '../api';
import type { ThreatReviewRequest } from '../types';

interface ReviewThreatVariables {
  threatId: string;
  body: ThreatReviewRequest;
}

export function useReviewThreatMutation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ threatId, body }: ReviewThreatVariables) =>
      reviewThreat(token, threatId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['threats'] });
    },
  });
}
