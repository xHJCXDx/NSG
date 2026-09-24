import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../../auth';
import { triggerWorkflow } from '../api';

export function useTriggerWorkflow() {
  const { token } = useAuth();

  return useMutation({
    mutationFn: () => triggerWorkflow(token),
  });
}
