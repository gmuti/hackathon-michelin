import { Platform } from 'react-native';

// Emulator: Android → 10.0.2.2, iOS → localhost
// Physical device: replace with your machine's local IP (e.g. 192.168.1.42)
const DEV_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
export const API_URL = `http://${DEV_HOST}:3000/api/v1`;

type ApiResponse<T> = { data: T; error: null } | { data: null; error: string };

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<ApiResponse<T>> {
  const { token, headers: extraHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(extraHeaders as Record<string, string>),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  try {
    const res = await fetch(`${API_URL}${path}`, { ...rest, headers });
    const json = await res.json();
    if (!res.ok) {
      return { data: null, error: json.error ?? 'Une erreur est survenue' };
    }
    return json as ApiResponse<T>;
  } catch {
    return { data: null, error: 'Impossible de contacter le serveur' };
  }
}

export const api = {
  get: <T>(path: string, token?: string) =>
    request<T>(path, { method: 'GET', token }),
  post: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body), token }),
  patch: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body), token }),
};
