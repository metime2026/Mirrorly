/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Message } from '../../src/types';
import { USER_ID } from '../config';
import { getSql } from './client';
import { asRows } from './rows';

export async function getMessages(): Promise<Message[]> {
  const sql = getSql();
  const rows = asRows<{ messages: unknown }>(await sql`
    SELECT messages FROM conversations WHERE user_id = ${USER_ID} LIMIT 1
  `);
  if (!rows.length) return [];
  const raw = rows[0].messages;
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  return Array.isArray(parsed) ? (parsed as Message[]) : [];
}

export async function saveMessages(messages: Message[]): Promise<void> {
  const sql = getSql();
  const id = `conv_${USER_ID}`;
  const now = new Date().toISOString();
  const payload = JSON.stringify(messages);

  await sql`
    INSERT INTO conversations (id, user_id, messages, created_at, updated_at)
    VALUES (${id}, ${USER_ID}, ${payload}::jsonb, ${now}, ${now})
    ON CONFLICT (user_id) DO UPDATE SET
      messages = EXCLUDED.messages,
      updated_at = EXCLUDED.updated_at
  `;
}

export async function clearConversation(): Promise<void> {
  const sql = getSql();
  await sql`DELETE FROM conversations WHERE user_id = ${USER_ID}`;
}
