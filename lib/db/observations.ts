/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { USER_ID } from '../config';
import { getSql } from './client';
import { asRows } from './rows';

export type ObservationCacheRow = {
  user_id: string;
  text: string;
  stage: string | null;
  observation_part: string | null;
  evidence_part: string | null;
  question_part: string | null;
  entries_count: number;
  generated_at: string | Date;
  expired_at: string | Date;
};

export async function getObservationCache(): Promise<ObservationCacheRow | null> {
  const sql = getSql();
  const rows = asRows<ObservationCacheRow>(await sql`
    SELECT * FROM observation_cache WHERE user_id = ${USER_ID} LIMIT 1
  `);
  return rows.length ? rows[0] : null;
}

export async function upsertObservationCache(data: {
  text: string;
  stage: string;
  observationPart: string;
  evidencePart: string;
  questionPart: string;
  entriesCount: number;
  expiredAt: string;
}): Promise<void> {
  const sql = getSql();
  const now = new Date().toISOString();
  await sql`
    INSERT INTO observation_cache (
      user_id, text, stage, observation_part, evidence_part, question_part,
      entries_count, generated_at, expired_at
    ) VALUES (
      ${USER_ID}, ${data.text}, ${data.stage},
      ${data.observationPart}, ${data.evidencePart}, ${data.questionPart},
      ${data.entriesCount}, ${now}, ${data.expiredAt}
    )
    ON CONFLICT (user_id) DO UPDATE SET
      text = EXCLUDED.text,
      stage = EXCLUDED.stage,
      observation_part = EXCLUDED.observation_part,
      evidence_part = EXCLUDED.evidence_part,
      question_part = EXCLUDED.question_part,
      entries_count = EXCLUDED.entries_count,
      generated_at = EXCLUDED.generated_at,
      expired_at = EXCLUDED.expired_at
  `;
}

export async function clearObservationCache(): Promise<void> {
  const sql = getSql();
  await sql`DELETE FROM observation_cache WHERE user_id = ${USER_ID}`;
}

export async function appendObservationHistory(data: {
  stage: string;
  text: string;
  observationPart: string;
  evidencePart: string;
  questionPart: string;
}): Promise<void> {
  const sql = getSql();
  const id = `obs_hist_${Date.now()}`;

  const dup = asRows<{ id: string }>(await sql`
    SELECT id FROM observation_history
    WHERE user_id = ${USER_ID} AND text = ${data.text}
    LIMIT 1
  `);
  if (dup.length) return;

  await sql`
    INSERT INTO observation_history (
      id, user_id, stage, text, observation_part, evidence_part, question_part
    ) VALUES (
      ${id}, ${USER_ID}, ${data.stage}, ${data.text},
      ${data.observationPart}, ${data.evidencePart}, ${data.questionPart}
    )
  `;

  await sql`
    DELETE FROM observation_history
    WHERE id IN (
      SELECT id FROM observation_history
      WHERE user_id = ${USER_ID}
      ORDER BY generated_at DESC
      OFFSET 10
    )
  `;
}

export type ObservationHistoryRow = {
  id: string;
  stage: string | null;
  text: string;
  observation_part: string | null;
  evidence_part: string | null;
  question_part: string | null;
  generated_at: string | Date;
};

export async function listObservationHistory(): Promise<ObservationHistoryRow[]> {
  const sql = getSql();
  return asRows<ObservationHistoryRow>(await sql`
    SELECT id, stage, text, observation_part, evidence_part, question_part, generated_at
    FROM observation_history
    WHERE user_id = ${USER_ID}
    ORDER BY generated_at DESC
    LIMIT 10
  `);
}

export async function seedObservationHistory(
  items: Array<{ id: string; stage: string; text: string; generatedAt: string }>,
): Promise<void> {
  const sql = getSql();
  for (const item of items) {
    await sql`
      INSERT INTO observation_history (id, user_id, stage, text, generated_at)
      VALUES (${item.id}, ${USER_ID}, ${item.stage}, ${item.text}, ${item.generatedAt})
      ON CONFLICT (id) DO NOTHING
    `;
  }
}

export async function clearObservationHistory(): Promise<void> {
  const sql = getSql();
  await sql`DELETE FROM observation_history WHERE user_id = ${USER_ID}`;
}
