interface LoginResponse {
  access_token: string;
}

export async function loginWithCredentials(username: string, password: string) {
  const formData = new URLSearchParams();
  formData.append('username', username);
  formData.append('password', password);

  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Invalid credentials');
  }

  const data = (await response.json()) as LoginResponse;
  return data.access_token;
}
