/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { USER_ID } from '../../config';
import {
  buildSessionCookie,
  clearSessionCookie,
  createSession,
  deleteSession,
  validateSession,
  verifyPassword,
} from '../../auth/session';
import { isGeminiConfigured } from '../../services/gemini';
import { SESSION_COOKIE } from '../../config';
import type { ApiRequest, ApiResponse } from '../context';
import { json, parseBody } from '../context';

export async function handleAuthLogin(req: ApiRequest) {
  const { password } = parseBody<{ password?: string }>(req.body);
  if (!password) {
    return json({ error: '请输入密码' }, 400);
  }
  if (!verifyPassword(password)) {
    return json({ error: '密码错误' }, 401);
  }
  const sessionId = await createSession();
  return json(
    { success: true, userId: USER_ID },
    200,
    { 'Set-Cookie': buildSessionCookie(sessionId) },
  );
}

export async function handleAuthLogout(req: ApiRequest) {
  const sessionId = req.cookies[SESSION_COOKIE];
  if (sessionId) {
    await deleteSession(sessionId);
  }
  return json({ success: true }, 200, { 'Set-Cookie': clearSessionCookie() });
}

export async function handleAuthMe(req: ApiRequest) {
  const sessionId = req.cookies[SESSION_COOKIE];
  const ok = await validateSession(sessionId);
  if (!ok) {
    return json({ authenticated: false }, 401);
  }
  return json({
    authenticated: true,
    id: USER_ID,
    email: process.env.MIRRORLY_USER_EMAIL || 'owner@mirrorly.local',
    nickname: process.env.MIRRORLY_USER_NICKNAME || 'Metime',
    isApiKeyConfigured: isGeminiConfigured(),
  });
}

export async function handleCurrentUser(req: ApiRequest) {
  const sessionId = req.cookies[SESSION_COOKIE];
  const ok = await validateSession(sessionId);
  if (!ok) {
    return json({ error: '未登录' }, 401);
  }
  return json({
    id: USER_ID,
    email: process.env.MIRRORLY_USER_EMAIL || 'owner@mirrorly.local',
    nickname: process.env.MIRRORLY_USER_NICKNAME || 'Metime',
    isApiKeyConfigured: isGeminiConfigured(),
  });
}

export function isPublicPath(path: string[]): boolean {
  const route = path.join('/');
  return route === 'auth/login' || route === 'auth/me';
}

export async function requireAuth(req: ApiRequest): Promise<ApiResponse | null> {
  if (isPublicPath(req.path)) return null;
  const sessionId = req.cookies[SESSION_COOKIE];
  const ok = await validateSession(sessionId);
  if (!ok) {
    return json({ error: '未登录或会话已过期', code: 'UNAUTHORIZED' }, 401);
  }
  return null;
}
