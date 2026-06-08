/**
 * 一键：写入 .env.local → 推送 Vercel 环境变量 → 拉取 POSTGRES_URL → 执行迁移
 */

import { spawnSync } from 'child_process';
import crypto from 'crypto';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import postgres from 'postgres';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ENV_FILE = path.join(ROOT, '.env.local');
const VERCEL_ENV_FILE = path.join(ROOT, '.env.vercel.local');

function log(step: string, msg: string) {
  console.log(`[${step}] ${msg}`);
}

function generatePassword(): string {
  return crypto
    .randomBytes(18)
    .toString('base64')
    .replace(/[/+=]/g, '')
    .slice(0, 24);
}

function parseEnvFile(file: string): Record<string, string> {
  if (!fs.existsSync(file)) return {};
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const m = t.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

function writeEnvFile(vars: Record<string, string>) {
  const order = [
    'POSTGRES_URL',
    'DATABASE_URL',
    'GEMINI_API_KEY',
    'GEMINI_MODEL',
    'MIRRORLY_PASSWORD',
    'MIRRORLY_USER_ID',
    'MIRRORLY_USER_EMAIL',
    'MIRRORLY_USER_NICKNAME',
    'API_PORT',
  ];
  const lines = ['# Mirrorly 环境变量（自动生成，勿提交 Git）', ''];
  const used = new Set<string>();

  for (const key of order) {
    if (vars[key] !== undefined && vars[key] !== '') {
      lines.push(`${key}="${vars[key]}"`);
      used.add(key);
    }
  }
  for (const [k, v] of Object.entries(vars)) {
    if (!used.has(k) && v) lines.push(`${k}="${v}"`);
  }
  fs.writeFileSync(ENV_FILE, lines.join('\n') + '\n', 'utf8');
}

function vercel(args: string[], input?: string): string {
  const r = spawnSync('npx', ['vercel', ...args], {
    cwd: ROOT,
    input,
    encoding: 'utf8',
    env: process.env,
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  });
  if (r.status !== 0) {
    throw new Error(
      `vercel ${args.join(' ')} 失败:\n${r.stderr || r.stdout}`,
    );
  }
  return r.stdout;
}

function pushVercelEnv(name: string, value: string) {
  for (const env of ['production', 'preview', 'development']) {
    vercel(['env', 'add', name, env, '--force', '--sensitive'], value);
    log('Vercel', `${name} → ${env}`);
  }
}

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

async function runMigrations() {
  const connectionString =
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL;

  if (
    !connectionString ||
    connectionString.includes('user:password@host')
  ) {
    throw new Error('POSTGRES_URL 无效。请确认 Vercel 已绑定 Neon/Postgres 存储。');
  }

  const sql = postgres(connectionString, { max: 1 });
  const dir = path.join(ROOT, 'migrations');

  for (const file of fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()) {
    const version = file.replace(/\.sql$/, '');
    let existing: { version: string }[] = [];
    try {
      existing =
        await sql`SELECT version FROM schema_migrations WHERE version = ${version} LIMIT 1`;
    } catch {
      existing = [];
    }
    if (existing.length) {
      log('Migrate', `跳过 ${file}（已应用）`);
      continue;
    }

    let content = fs.readFileSync(path.join(dir, file), 'utf8');
    if (file === '002_owner_user.sql') {
      content = applyOwnerPlaceholders(content);
    }

    log('Migrate', `应用 ${file}…`);
    await sql.unsafe(content);
    await sql`
      INSERT INTO schema_migrations (version) VALUES (${version})
      ON CONFLICT (version) DO NOTHING
    `;
    log('Migrate', `✓ ${file}`);
  }

  await sql.end();
}

async function main() {
  const gemini = process.env.GEMINI_API_KEY?.trim();
  if (!gemini || gemini === 'YOUR_GEMINI_API_KEY') {
    throw new Error('缺少 GEMINI_API_KEY');
  }

  try {
    vercel(['whoami']);
  } catch {
    if (!process.env.VERCEL_TOKEN) {
      throw new Error('未登录 Vercel。请设置 VERCEL_TOKEN 环境变量。');
    }
  }

  const existing = parseEnvFile(ENV_FILE);
  const password =
    process.env.MIRRORLY_PASSWORD?.trim() ||
    (existing.MIRRORLY_PASSWORD &&
    existing.MIRRORLY_PASSWORD !== 'your-strong-password-here'
      ? existing.MIRRORLY_PASSWORD
      : generatePassword());

  writeEnvFile({ ...existing, GEMINI_API_KEY: gemini, MIRRORLY_PASSWORD: password });
  log('Env', `已更新 ${ENV_FILE}`);

  if (!fs.existsSync(path.join(ROOT, '.vercel', 'project.json'))) {
    log('Vercel', '关联项目 mirrorly…');
    vercel(['link', '--project', 'mirrorly', '--yes']);
  }

  log('Vercel', '推送 GEMINI_API_KEY、MIRRORLY_PASSWORD…');
  pushVercelEnv('GEMINI_API_KEY', gemini);
  pushVercelEnv('MIRRORLY_PASSWORD', password);

  log('Vercel', '拉取生产环境变量（POSTGRES_URL 等）…');
  vercel(['env', 'pull', '.env.vercel.local', '--yes', '--environment=production']);

  const pulled = parseEnvFile(VERCEL_ENV_FILE);
  const merged = {
    ...parseEnvFile(ENV_FILE),
    ...pulled,
    GEMINI_API_KEY: gemini,
    MIRRORLY_PASSWORD: password,
  };
  writeEnvFile(merged);

  dotenv.config({ path: ENV_FILE });
  dotenv.config({ path: VERCEL_ENV_FILE });

  log('Migrate', '执行 migrations/*.sql …');
  await runMigrations();

  console.log('\n✅ 全部完成');
  console.log(`   登录密码 MIRRORLY_PASSWORD: ${password}`);
}

main().catch((err) => {
  console.error('\n❌', err instanceof Error ? err.message : err);
  process.exit(1);
});
