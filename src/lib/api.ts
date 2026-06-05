/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const res = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  return res;
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(path, init);
  const data = await res.json();
  if (!res.ok) {
    throw new ApiError(
      (data as { error?: string; message?: string })?.error ||
        (data as { message?: string })?.message ||
        res.statusText,
      res.status,
      data,
    );
  }
  return data as T;
}
