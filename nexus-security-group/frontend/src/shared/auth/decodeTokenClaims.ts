export interface TokenClaims {
  sub?: string;
  role?: string;
  auth_source?: string;
  user_id?: number;
  permissions?: string[];
}

const decodeBase64Url = (value: string): string => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  const decoded = globalThis.atob(padded);

  return decodeURIComponent(
    Array.from(decoded, (char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''),
  );
};

export function decodeTokenClaims(token: string | null): TokenClaims {
  if (!token) {
    return {};
  }

  const [, payload] = token.split('.');
  if (!payload) {
    return {};
  }

  try {
    const parsed = JSON.parse(decodeBase64Url(payload)) as Record<string, unknown>;

    return {
      sub: typeof parsed.sub === 'string' ? parsed.sub : undefined,
      role: typeof parsed.role === 'string' ? parsed.role : undefined,
      auth_source: typeof parsed.auth_source === 'string' ? parsed.auth_source : undefined,
      user_id: typeof parsed.user_id === 'number' ? parsed.user_id : undefined,
      permissions: Array.isArray(parsed.permissions)
        ? parsed.permissions.filter((permission): permission is string => typeof permission === 'string')
        : undefined,
    };
  } catch {
    return {};
  }
}
