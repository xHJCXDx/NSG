interface LoginResponse {
  access_token: string;
}

export type LoginErrorCode = 'invalid_credentials' | 'rate_limited' | 'service_unavailable' | 'network' | 'unknown';

export class LoginError extends Error {
  constructor(public readonly code: LoginErrorCode) {
    super(code);
    this.name = 'LoginError';
  }
}

export async function loginWithCredentials(username: string, password: string) {
  const formData = new URLSearchParams();
  formData.append('username', username);
  formData.append('password', password);

  let response: Response;
  try {
    response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });
  } catch {
    throw new LoginError('network');
  }

  if (!response.ok) {
    if (response.status === 401) throw new LoginError('invalid_credentials');
    if (response.status === 429) throw new LoginError('rate_limited');
    if (response.status === 503 || response.status >= 500) throw new LoginError('service_unavailable');
    throw new LoginError('unknown');
  }

  const data = (await response.json()) as LoginResponse;
  return data.access_token;
}
