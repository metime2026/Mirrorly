/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Entry } from '../../src/types';
import { USER_ID } from '../config';
import { getSql } from './client';
import { rowToEntry, type EntryRow } from './mapEntry';
import { asRows } from './rows';

export async function countEntries(): Promise<number> {
  const sql = getSql();
  const rows = asRows<{ count: number }>(await sql`
    SELECT COUNT(*)::int AS count FROM entries WHERE user_id = ${USER_ID}
  `);
  return Number(rows[0]?.count ?? 0);
}

function sortEntries(rows: EntryRow[], sort?: string): EntryRow[] {
  const asc = sort === 'oldest';
  return [...rows].sort((a, b) => {
    const ta = new Date(a.created_at).getTime();
    const tb = new Date(b.created_at).getTime();
    return asc ? ta - tb : tb - ta;
  });
}

export async function listEntries(params: {
  search?: string;
  sort?: string;
  tag?: string;
}): Promise<Entry[]> {
  const sql = getSql();
  const search = (params.search || '').trim().toLowerCase();
  const tag = params.tag || '';
  const pattern = search ? `%${search}%` : '';

  let rows: EntryRow[];

  if (search && tag && tag !== '全部') {
    rows = asRows<EntryRow>(await sql`
      SELECT * FROM entries
      WHERE user_id = ${USER_ID}
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(tags) AS elem WHERE elem = ${tag}
        )
        AND (
          LOWER(content) LIKE ${pattern}
          OR LOWER(insight) LIKE ${pattern}
          OR LOWER(source) LIKE ${pattern}
        )
    `);
  } else if (search) {
    rows = asRows<EntryRow>(await sql`
      SELECT * FROM entries
      WHERE user_id = ${USER_ID}
        AND (
          LOWER(content) LIKE ${pattern}
          OR LOWER(insight) LIKE ${pattern}
          OR LOWER(source) LIKE ${pattern}
        )
    `);
  } else if (tag && tag !== '全部') {
    rows = asRows<EntryRow>(await sql`
      SELECT * FROM entries
      WHERE user_id = ${USER_ID}
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(tags) AS elem WHERE elem = ${tag}
        )
    `);
  } else {
    rows = asRows<EntryRow>(await sql`
      SELECT * FROM entries WHERE user_id = ${USER_ID}
    `);
  }

  return sortEntries(rows, params.sort).map(rowToEntry);
}

export async function getEntryById(id: string): Promise<Entry | null> {
  const sql = getSql();
  const rows = asRows<EntryRow>(await sql`
    SELECT * FROM entries WHERE id = ${id} AND user_id = ${USER_ID} LIMIT 1
  `);
  if (!rows.length) return null;
  return rowToEntry(rows[0]);
}

export async function createEntry(data: {
  content: string;
  insight: string;
  source: string;
  tags: string[];
  emotion: string;
}): Promise<Entry> {
  const sql = getSql();
  const id = `entry_${Date.now()}`;
  const now = new Date().toISOString();

  await sql`
    INSERT INTO entries (id, user_id, content, insight, source, tags, emotion, created_at, updated_at)
    VALUES (
      ${id}, ${USER_ID},
      ${data.content}, ${data.insight}, ${data.source},
      ${JSON.stringify(data.tags)}::jsonb, ${data.emotion},
      ${now}, ${now}
    )
  `;
  await invalidateObservationCache();
  return (await getEntryById(id))!;
}

export async function updateEntry(
  id: string,
  data: {
    content: string;
    insight: string;
    source: string;
    tags: string[];
    emotion: string;
  },
): Promise<Entry | null> {
  const sql = getSql();
  const now = new Date().toISOString();

  const rows = asRows<EntryRow>(await sql`
    UPDATE entries SET
      content = ${data.content},
      insight = ${data.insight},
      source = ${data.source},
      tags = ${JSON.stringify(data.tags)}::jsonb,
      emotion = ${data.emotion},
      updated_at = ${now}
    WHERE id = ${id} AND user_id = ${USER_ID}
    RETURNING *
  `);
  if (!rows.length) return null;
  await invalidateObservationCache();
  return rowToEntry(rows[0]);
}

export async function deleteEntry(id: string): Promise<boolean> {
  const sql = getSql();
  const rows = asRows<{ id: string }>(await sql`
    DELETE FROM entries WHERE id = ${id} AND user_id = ${USER_ID} RETURNING id
  `);
  if (rows.length) await invalidateObservationCache();
  return rows.length > 0;
}

export async function deleteAllEntries(): Promise<void> {
  const sql = getSql();
  await sql`DELETE FROM entries WHERE user_id = ${USER_ID}`;
  await invalidateObservationCache();
}

export async function insertEntriesBatch(entries: Entry[]): Promise<void> {
  const sql = getSql();
  for (const e of entries) {
    await sql`
      INSERT INTO entries (id, user_id, content, insight, source, tags, emotion, created_at, updated_at)
      VALUES (
        ${e.id}, ${USER_ID}, ${e.content}, ${e.insight}, ${e.source || ''},
        ${JSON.stringify(e.tags)}::jsonb, ${e.emotion || '平静'},
        ${e.createdAt}, ${e.updatedAt}
      )
      ON CONFLICT (id) DO UPDATE SET
        content = EXCLUDED.content,
        insight = EXCLUDED.insight,
        source = EXCLUDED.source,
        tags = EXCLUDED.tags,
        emotion = EXCLUDED.emotion,
        updated_at = EXCLUDED.updated_at
    `;
  }
  await invalidateObservationCache();
}

export async function listAllEntries(): Promise<Entry[]> {
  const sql = getSql();
  const rows = asRows<EntryRow>(await sql`
    SELECT * FROM entries WHERE user_id = ${USER_ID} ORDER BY created_at DESC
  `);
  return rows.map(rowToEntry);
}

async function invalidateObservationCache(): Promise<void> {
  const sql = getSql();
  await sql`DELETE FROM observation_cache WHERE user_id = ${USER_ID}`;
}

export async function aggregateTags(): Promise<Array<{ tag: string; count: number }>> {
  const sql = getSql();
  const rows = asRows<{ tag: string; count: number }>(await sql`
    SELECT tag, COUNT(*)::int AS count
    FROM entries, jsonb_array_elements_text(tags) AS tag
    WHERE user_id = ${USER_ID}
    GROUP BY tag
    ORDER BY count DESC
  `);
  return rows.map((r) => ({ tag: String(r.tag), count: Number(r.count) }));
}
