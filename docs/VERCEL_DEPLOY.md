# Mirrorly · Vercel + PostgreSQL 部署指南

## 架构

| 层级 | 技术 |
|------|------|
| 前端 | Vite 静态构建 → `dist/` |
| API | Vercel Serverless `api/[...path].ts` |
| 数据库 | PostgreSQL（Vercel Postgres / Neon） |
| AI | Google Gemini |
| 认证 | 单用户密码 + HttpOnly Cookie 会话 |

## 一、创建 PostgreSQL

### 方式 A：Vercel Postgres（推荐）

1. 打开 [Vercel Dashboard](https://vercel.com) → 你的项目 → **Storage** → **Create Database** → **Postgres**
2. 连接后自动添加 `POSTGRES_URL` 等环境变量到项目

### 方式 B：Neon

1. [neon.tech](https://neon.tech) 创建项目，复制连接串
2. 在 Vercel 环境变量中添加 `POSTGRES_URL=postgresql://...`

## 二、配置环境变量

在 Vercel → **Settings** → **Environment Variables** 添加：

| 变量 | 必填 | 说明 |
|------|------|------|
| `POSTGRES_URL` | ✅ | Postgres 连接串（Storage 自动注入时可省略手动） |
| `GEMINI_API_KEY` | ✅ | [Google AI Studio](https://aistudio.google.com/apikey) |
| `MIRRORLY_PASSWORD` | ✅ | 你的私人登录密码 |
| `GEMINI_MODEL` | | 默认 `gemini-2.0-flash` |
| `MIRRORLY_USER_EMAIL` | | 展示用邮箱 |
| `MIRRORLY_USER_NICKNAME` | | 展示用昵称 |

## 三、执行数据库迁移

在**本机**（已配置 `POSTGRES_URL` 指向生产库）运行：

```bash
cp .env.example .env.local
# 编辑 .env.local，填入生产 POSTGRES_URL 与其它变量

npm install
npm run db:migrate
```

迁移文件位于 `migrations/`：

- `001_initial.sql` — 表结构
- `002_owner_user.sql` — 插入单用户记录

## 四、部署到 Vercel

```bash
# 安装 Vercel CLI（可选）
npm i -g vercel

# 关联并部署
vercel
vercel --prod
```

或在 GitHub 连接仓库后自动部署。`vercel.json` 已配置：

- `buildCommand`: `npm run build`
- `outputDirectory`: `dist`
- SPA 回退到 `index.html`
- API 函数 `maxDuration: 60s`（AI 调用）

## 五、本地开发

```bash
npm install
cp .env.example .env.local
# 填写 POSTGRES_URL、GEMINI_API_KEY、MIRRORLY_PASSWORD

npm run db:migrate
npm run dev
```

- 前端：http://localhost:5173  
- API：http://localhost:3001（Vite 将 `/api` 代理到此）

与生产一致的全栈本地环境：

```bash
npm run dev:vercel
```

## 六、API 路径（与前端一致）

| 方法 | 路径 |
|------|------|
| POST | `/api/auth/login` |
| GET | `/api/auth/me` |
| POST | `/api/auth/logout` |
| GET/POST | `/api/entries` |
| GET/PUT/DELETE | `/api/entries/:id` |
| GET | `/api/tags` |
| GET | `/api/observation?refresh=true` |
| GET | `/api/observation/history` |
| GET/POST | `/api/chat` |
| POST | `/api/chat/reset` |
| POST | `/api/seed` |
| POST | `/api/clear` |

除 `auth/login`、`auth/me` 外，均需有效登录 Cookie。

## 七、从 JSON 本地库迁移（可选）

若曾使用 `data/database.json`，可手动导出后调用 API 批量 POST `/api/entries`，或联系维护者添加一次性导入脚本。

## 故障排查

| 现象 | 处理 |
|------|------|
| 登录后 401 | 检查 `MIRRORLY_PASSWORD` 是否一致；生产环境需 HTTPS Cookie |
| 500 数据库错误 | 确认已 `npm run db:migrate`；检查 `POSTGRES_URL` |
| AI 无响应 | 确认 `GEMINI_API_KEY`；查看 Vercel Function Logs |
| 冷启动慢 | 正常；观察接口最长 60s |
