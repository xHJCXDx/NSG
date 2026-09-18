import { createAuthHeaders } from './authHeaders';

export async function authFetch(
  token: string | null,
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const { headers: extraHeaders, ...rest } = init;
  return fetch(url, {
    ...rest,
    headers: {
      ...createAuthHeaders(token),
      ...(extraHeaders as Record<string, string>),
    },
  });
}
