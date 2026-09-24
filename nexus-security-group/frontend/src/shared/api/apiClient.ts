import { createAuthHeaders } from './authHeaders';

export const AUTH_UNAUTHORIZED_EVENT = 'nsg:auth:unauthorized';

function notifyUnauthorizedSession() {
  window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT));
}

export async function authFetch(
  token: string | null,
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const { headers: extraHeaders, ...rest } = init;
  const response = await fetch(url, {
    ...rest,
    headers: {
      ...createAuthHeaders(token),
      ...(extraHeaders as Record<string, string>),
    },
  });

  if (response.status === 401) {
    notifyUnauthorizedSession();
  }

  return response;
}
