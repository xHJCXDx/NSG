import { authFetch } from '../../shared/api/apiClient';
import { ALERTS_COPY, ALERTS_ENDPOINT } from './contract';
import type { AlertResponse, AlertsQuery, ApiErrorResponse } from './types';

export { ALERTS_ENDPOINT } from './contract';

export class ListAlertsError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'ListAlertsError';
  }
}

export class AcknowledgeAlertError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'AcknowledgeAlertError';
  }
}

const readErrorDetail = async (response: Response): Promise<string | undefined> => {
  try {
    const data = (await response.json()) as ApiErrorResponse;
    return typeof data.detail === 'string' && data.detail.trim().length > 0 ? data.detail : undefined;
  } catch {
    return undefined;
  }
};

const fallbackMessageByStatus = (status: number, fallback: string): string => {
  if (status === 401) return ALERTS_COPY.errors.unauthenticated;
  if (status === 403) return ALERTS_COPY.errors.forbidden;
  if (status === 404) return ALERTS_COPY.errors.notFound;
  if (status === 422) return ALERTS_COPY.errors.validation;
  return fallback;
};

const buildAlertsUrl = (query: AlertsQuery = {}) => {
  const params = new URLSearchParams();
  params.set('limit', String(query.limit ?? 50));
  params.set('offset', String(query.offset ?? 0));

  if (query.delivery_status) {
    params.set('delivery_status', query.delivery_status);
  }

  if (query.acknowledged !== undefined) {
    params.set('acknowledged', String(query.acknowledged));
  }

  return `${ALERTS_ENDPOINT}?${params.toString()}`;
};

export async function listAlerts(token: string | null, query: AlertsQuery = {}): Promise<AlertResponse[]> {
  if (!token) throw new ListAlertsError(ALERTS_COPY.errors.listWithoutToken);

  try {
    const response = await authFetch(token, buildAlertsUrl(query), { method: 'GET' });
    if (!response.ok) {
      const detail = await readErrorDetail(response);
      throw new ListAlertsError(detail ?? fallbackMessageByStatus(response.status, ALERTS_COPY.errors.listFallback), response.status);
    }

    return (await response.json()) as AlertResponse[];
  } catch (error) {
    if (error instanceof ListAlertsError) throw error;
    throw new ListAlertsError(ALERTS_COPY.errors.serviceUnavailable);
  }
}

export async function acknowledgeAlert(token: string | null, alertId: number): Promise<AlertResponse> {
  if (!token) throw new AcknowledgeAlertError(ALERTS_COPY.errors.acknowledgeWithoutToken);

  try {
    const response = await authFetch(token, `${ALERTS_ENDPOINT}/${alertId}/acknowledge`, { method: 'PATCH' });
    if (!response.ok) {
      const detail = await readErrorDetail(response);
      throw new AcknowledgeAlertError(detail ?? fallbackMessageByStatus(response.status, ALERTS_COPY.errors.acknowledgeFallback), response.status);
    }

    return (await response.json()) as AlertResponse;
  } catch (error) {
    if (error instanceof AcknowledgeAlertError) throw error;
    throw new AcknowledgeAlertError(ALERTS_COPY.errors.serviceUnavailable);
  }
}
