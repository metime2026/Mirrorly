/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { getSql } from '../db/client';
import { asRows } from '../db/rows';
import { SESSION_COOKIE, SESSION_DAYS, USER_ID, isProduction } from '../config';

export function verifyPassword(input: string): boolean {
  const expected = process.env.MIRRORLY_PASSWORD;
  if (!expected) {
    throw new Error('MIRRORLY_PASSWORD is not configured on the server.');
  }
  const a = Buffer.from(input, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(
    header.split(';').map((part) => {
      const [k, ...rest] = part.trim().split('=');
      return [k, decodeURIComponent(rest.join('='))];
    }),
  );
}

export function buildSessionCookie(sessionId: string): string {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  const secure = isProduction() ? '; Secure' : '';
  return `${SESSION_COOKIE}=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export async function createSession(): Promise<string> {
  const sql = getSql();
  const sessionId = `sess_${randomBytes(24).toString('hex')}`;
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000);
  await sql`
    INSERT INTO sessions (id, user_id, expires_at)
    VALUES (${sessionId}, ${USER_ID}, ${expiresAt.toISOString()})
  `;
  return sessionId;
}

export async function validateSession(sessionId: string | undefined): Promise<boolean> {
  if (!sessionId) return false;
  const sql = getSql();
  const rows = asRows<{ id: string }>(await sql`
    SELECT id FROM sessions
    WHERE id = ${sessionId}
      AND user_id = ${USER_ID}
      AND expires_at > NOW()
    LIMIT 1
  `);
  return rows.length > 0;
}

export async function deleteSession(sessionId: string): Promise<void> {
  const sql = getSql();
  await sql`DELETE FROM sessions WHERE id = ${sessionId}`;
}

/** 用于迁移脚本等无 cookie 场景 */
export function hashForLog(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 8);
}
