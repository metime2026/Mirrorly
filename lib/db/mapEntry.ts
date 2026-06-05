/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Entry } from '../../src/types';

export type EntryRow = {
  id: string;
  user_id: string;
  content: string;
  insight: string;
  source: string;
  tags: string[] | unknown;
  emotion: string;
  created_at: string | Date;
  updated_at: string | Date;
};

export function rowToEntry(row: EntryRow): Entry {
  const tags = Array.isArray(row.tags)
    ? row.tags.map(String)
    : typeof row.tags === 'string'
      ? (JSON.parse(row.tags) as string[])
      : [];
  return {
    id: row.id,
    userId: row.user_id,
    content: row.content,
    insight: row.insight,
    source: row.source || undefined,
    tags,
    emotion: row.emotion,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}
