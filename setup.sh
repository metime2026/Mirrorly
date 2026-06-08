#!/usr/bin/env bash
#
# Mirrorly · 一键将 GEMINI_API_KEY / MIRRORLY_PASSWORD 推送到 Vercel
#
# 用法（无需交互输入）:
#   1. 在 .env.local 中写好 GEMINI_API_KEY（只需配置一次）
#   2. bash setup.sh
#
# 前置: 已安装 Node.js，且执行过 vercel login（或使用 VERCEL_TOKEN）
#

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}✓${NC} $*"; }
warn()  { echo -e "${YELLOW}!${NC} $*"; }
fail()  { echo -e "${RED}✗${NC} $*" >&2; exit 1; }

# ── 1. 检查 Vercel CLI ─────────────────────────────────────────────
if ! command -v vercel >/dev/null 2>&1; then
  if command -v npx >/dev/null 2>&1; then
    VERCEL="npx vercel"
  else
    fail "未找到 vercel 命令。请运行: npm i -g vercel"
  fi
else
  VERCEL="vercel"
fi

# ── 2. 检查登录状态 ────────────────────────────────────────────────
if [[ -z "${VERCEL_TOKEN:-}" ]]; then
  if ! $VERCEL whoami >/dev/null 2>&1; then
    fail "未登录 Vercel。请先运行: vercel login"
  fi
  info "Vercel 账号: $($VERCEL whoami)"
else
  export VERCEL_TOKEN
  info "使用 VERCEL_TOKEN 进行认证"
fi

# ── 3. 关联 Vercel 项目 ────────────────────────────────────────────
if [[ ! -f .vercel/project.json ]]; then
  warn "未检测到 .vercel/project.json，正在自动 link…"
  $VERCEL link --yes
fi
info "Vercel 项目已关联"

# ── 4. 读取 / 准备 .env.local ──────────────────────────────────────
if [[ ! -f .env.local ]]; then
  if [[ -f .env.example ]]; then
    cp .env.example .env.local
    warn "已根据 .env.example 创建 .env.local"
  else
    touch .env.local
  fi
fi

# 安全加载 .env.local（忽略注释行）
load_env_file() {
  local file=$1
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line#"${line%%[![:space:]]*}"}"
    [[ -z "$line" || "$line" == \#* ]] && continue
    if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
      local key="${BASH_REMATCH[1]}"
      local val="${BASH_REMATCH[2]}"
      val="${val%\"}"; val="${val#\"}"
      val="${val%\'}"; val="${val#\'}"
      export "$key=$val"
    fi
  done < "$file"
}

load_env_file .env.local

set_env_var() {
  local key=$1
  local value=$2
  local file=.env.local
  local tmp="${file}.tmp.$$"

  if grep -q "^${key}=" "$file" 2>/dev/null; then
    awk -v k="$key" -v v="$value" '
      BEGIN { q = sprintf("%c", 34) }
      $0 ~ "^" k "=" { print k "=" q v q; next }
      { print }
    ' "$file" > "$tmp"
  else
    cp "$file" "$tmp"
    printf '%s="%s"\n' "$key" "$value" >> "$tmp"
  fi
  mv "$tmp" "$file"
}

generate_password() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 24 | tr -d '/+=' | cut -c1-24
  else
    tr -dc 'A-Za-z0-9' </dev/urandom | head -c 24
  fi
}

# GEMINI_API_KEY：优先环境变量，其次 .env.local
GEMINI_API_KEY="${GEMINI_API_KEY:-}"
if [[ -z "$GEMINI_API_KEY" || "$GEMINI_API_KEY" == "YOUR_GEMINI_API_KEY" || "$GEMINI_API_KEY" == "MY_GEMINI_API_KEY" ]]; then
  fail "请在 .env.local 中设置有效的 GEMINI_API_KEY 后再运行本脚本（无需运行时手动输入）。"
fi

# MIRRORLY_PASSWORD：缺失则自动生成并写回 .env.local
MIRRORLY_PASSWORD="${MIRRORLY_PASSWORD:-}"
if [[ -z "$MIRRORLY_PASSWORD" || "$MIRRORLY_PASSWORD" == "your-strong-password-here" ]]; then
  MIRRORLY_PASSWORD="$(generate_password)"
  set_env_var "MIRRORLY_PASSWORD" "$MIRRORLY_PASSWORD"
  info "已自动生成 MIRRORLY_PASSWORD 并写入 .env.local"
fi

# ── 5. 推送到 Vercel（production / preview / development）──────────
push_env() {
  local name=$1
  local value=$2
  local sensitive=${3:-false}
  local extra=()
  [[ "$sensitive" == "true" ]] && extra+=(--sensitive)

  for env in production preview development; do
    printf '%s' "$value" | $VERCEL env add "$name" "$env" --force "${extra[@]}" >/dev/null
    info "Vercel · $name → $env"
  done
}

echo ""
echo "正在同步环境变量到 Vercel…"
echo ""

push_env "GEMINI_API_KEY" "$GEMINI_API_KEY" true
push_env "MIRRORLY_PASSWORD" "$MIRRORLY_PASSWORD" true

echo ""
info "全部完成！"
echo ""
echo "  GEMINI_API_KEY    → 已写入 Vercel（production / preview / development）"
echo "  MIRRORLY_PASSWORD → 已写入 Vercel"
echo ""
echo "  登录密码: ${MIRRORLY_PASSWORD}"
echo "  （已保存在 .env.local，请妥善保管）"
echo ""
echo "  下一步: vercel --prod  或推送 Git 触发部署"
echo ""
