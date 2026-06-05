/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 用法: npm run db:migrate
 * 需要环境变量 POSTGRES_URL（或 DATABASE_URL）
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import postgres from 'postgres';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

const connectionString =
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL;

if (!connectionString) {
  console.error('❌ 请设置 POSTGRES_URL 或 DATABASE_URL');
  process.exit(1);
}

const sql = postgres(connectionString, { max: 1 });

const MIGRATIONS_DIR = path.join(process.cwd(), 'migrations');

function applyOwnerPlaceholders(content: string): string {
  return content
    .replace(/__USER_ID__/g, process.env.MIRRORLY_USER_ID || 'user_default')
    .replace(
      /__USER_EMAIL__/g,
      process.env.MIRRORLY_USER_EMAIL || 'owner@mirrorly.local',
    )
    .replace(
      /__USER_NICKNAME__/g,
      process.env.MIRRORLY_USER_NICKNAME || 'Metime',
    );
}

async function main() {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  console.log(`📦 连接数据库，准备执行 ${files.length} 个迁移文件…`);

  for (const file of files) {
    const version = file.replace(/\.sql$/, '');
    let existing: { version: string }[] = [];
    try {
      existing = await sql`
        SELECT version FROM schema_migrations WHERE version = ${version} LIMIT 1
      `;
    } catch {
      existing = [];
    }

    if (existing.length > 0) {
      console.log(`⏭  跳过 ${file}（已应用）`);
      continue;
    }

    let content = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
    if (file === '002_owner_user.sql') {
      content = applyOwnerPlaceholders(content);
    }

    console.log(`▶  应用 ${file}…`);
    await sql.unsafe(content);
    await sql`
      INSERT INTO schema_migrations (version) VALUES (${version})
      ON CONFLICT (version) DO NOTHING
    `;
    console.log(`✓  ${file} 完成`);
  }

  console.log('✅ 数据库迁移全部完成');
  await sql.end();
}

main().catch((err) => {
  console.error('迁移失败:', err);
  process.exit(1);
});
