import { createAuthHeaders } from '../../shared/api/authHeaders';
import { AUTOMATION_COPY, AUTOMATION_ENDPOINT, AUTOMATION_STATUS } from './contract';
import type { AutomationStatus, TriggerResult } from './types';

export function getAutomationStatus(): AutomationStatus {
  return AUTOMATION_STATUS;
}

export async function triggerWorkflow(token: string | null): Promise<TriggerResult> {
  if (!token) {
    return { state: 'error', message: AUTOMATION_COPY.error.unauthenticated };
  }

  try {
    const response = await fetch(`${AUTOMATION_ENDPOINT}/${AUTOMATION_STATUS.webhookId}`, {
      method: 'POST',
      headers: {
        ...createAuthHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ source: 'dashboard' }),
    });

    if (!response.ok) {
      const detail = await response.json().then((d) => d.detail).catch(() => undefined);
      return {
        state: 'error',
        message: typeof detail === 'string' ? detail : AUTOMATION_COPY.error.fallback,
      };
    }

    return { state: 'success', message: AUTOMATION_COPY.success };
  } catch {
    return { state: 'error', message: AUTOMATION_COPY.error.fallback };
  }
}
