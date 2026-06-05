/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type QueryValue = string | string[] | undefined;

export interface ApiRequest {
  method: string;
  path: string[];
  query: Record<string, QueryValue>;
  body: unknown;
  cookies: Record<string, string>;
}

export interface ApiResponse {
  status: number;
  headers?: Record<string, string>;
  body?: unknown;
}

export function json(
  data: unknown,
  status = 200,
  headers?: Record<string, string>,
): ApiResponse {
  return {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: data,
  };
}

export function parseBody<T>(body: unknown): T {
  if (typeof body === 'string') {
    return JSON.parse(body) as T;
  }
  return body as T;
}

export function queryString(q: Record<string, QueryValue>, key: string): string {
  const v = q[key];
  if (Array.isArray(v)) return v[0] ?? '';
  return v ?? '';
}
