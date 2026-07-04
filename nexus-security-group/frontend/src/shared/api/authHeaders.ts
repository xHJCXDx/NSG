export function createAuthHeaders(token: string | null) {
  return {
    Authorization: `Bearer ${token}`,
  };
}
