/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 本地 API 开发服务器（供 Vite 代理 /api → 3001）
 */

import dotenv from 'dotenv';
import http from 'http';
import path from 'path';
import { parseCookies } from '../lib/auth/session';
import { routeApi } from '../lib/api/router';
import type { ApiRequest } from '../lib/api/context';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

const PORT = Number(process.env.API_PORT) || 3001;

function readBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve(undefined);
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve(raw);
      }
    });
    req.on('error', reject);
  });
}

function parseUrl(url: string) {
  const u = new URL(url, `http://localhost:${PORT}`);
  const segments = u.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);
  const query: Record<string, string> = {};
  u.searchParams.forEach((v, k) => {
    query[k] = v;
  });
  return { path: segments, query };
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    const { path: pathSegments, query } = parseUrl(req.url || '/');
    const body = await readBody(req);
    const apiReq: ApiRequest = {
      method: req.method || 'GET',
      path: pathSegments,
      query,
      body,
      cookies: parseCookies(req.headers.cookie),
    };

    const apiRes = await routeApi(apiReq);

    if (apiRes.headers) {
      for (const [k, v] of Object.entries(apiRes.headers)) {
        res.setHeader(k, v);
      }
    }
    res.writeHead(apiRes.status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(apiRes.body ?? {}));
  } catch (err) {
    console.error(err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal Server Error' }));
  }
});

server.listen(PORT, () => {
  console.log(`[Mirrorly API] http://localhost:${PORT}/api`);
});
