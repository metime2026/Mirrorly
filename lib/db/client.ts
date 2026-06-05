/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { neon } from '@neondatabase/serverless';

function getDatabaseUrl(): string {
  const url =
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL;
  if (!url) {
    throw new Error(
      'Missing POSTGRES_URL (or DATABASE_URL). Add a Postgres database in Vercel Storage or Neon.',
    );
  }
  return url;
}

let sql: ReturnType<typeof neon> | null = null;

export function getSql() {
  if (!sql) {
    sql = neon(getDatabaseUrl());
  }
  return sql;
}
