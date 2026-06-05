-- Mirrorly PostgreSQL schema (Vercel / Neon compatible)

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT,
  nickname TEXT NOT NULL DEFAULT 'Owner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  insight TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT '',
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  emotion TEXT NOT NULL DEFAULT '平静',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entries_user_created
  ON entries (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_entries_tags
  ON entries USING GIN (tags);

CREATE INDEX IF NOT EXISTS idx_entries_search
  ON entries USING GIN (
    to_tsvector('simple', coalesce(content, '') || ' ' || coalesce(insight, '') || ' ' || coalesce(source, ''))
  );

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS observation_cache (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  stage TEXT,
  observation_part TEXT,
  evidence_part TEXT,
  question_part TEXT,
  entries_count INTEGER NOT NULL DEFAULT 0,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expired_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS observation_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stage TEXT,
  text TEXT NOT NULL,
  observation_part TEXT,
  evidence_part TEXT,
  question_part TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_observation_history_user
  ON observation_history (user_id, generated_at DESC);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_expires
  ON sessions (expires_at);
