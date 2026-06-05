/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parseCookies } from '../auth/session';
import type { ApiRequest } from './context';
import { routeApi } from './router';

function buildApiRequest(req: VercelRequest): ApiRequest {
  const pathParam = req.query.path;
  const path = Array.isArray(pathParam)
    ? pathParam
    : pathParam
      ? [pathParam]
      : [];

  let body: unknown = req.body;
  if (typeof body === 'string' && body.length) {
    try {
      body = JSON.parse(body);
    } catch {
      /* keep raw string */
    }
  }

  return {
    method: req.method || 'GET',
    path,
    query: req.query as ApiRequest['query'],
    body,
    cookies: parseCookies(req.headers.cookie),
  };
}

function sendResponse(res: VercelResponse, apiRes: Awaited<ReturnType<typeof routeApi>>) {
  if (apiRes.headers) {
    for (const [key, value] of Object.entries(apiRes.headers)) {
      res.setHeader(key, value);
    }
  }
  res.status(apiRes.status).json(apiRes.body ?? {});
}

export async function handleVercelApi(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const apiReq = buildApiRequest(req);
  const apiRes = await routeApi(apiReq);
  sendResponse(res, apiRes);
}
