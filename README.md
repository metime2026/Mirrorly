# Mirrorly

认知记录与反思对话工具。通过温和启发引导，AI 读取你的学识背景开展多轮反思，并自动提炼思维观察模式。

## 技术栈

- **前端**：React + Vite + Tailwind
- **后端**：Vercel Serverless Functions
- **数据库**：PostgreSQL（Neon / Vercel Postgres）
- **AI**：Google Gemini

## 本地开发

```bash
npm install
cp .env.example .env.local
# 编辑 .env.local：POSTGRES_URL、GEMINI_API_KEY、MIRRORLY_PASSWORD

npm run db:migrate
npm run dev
```

- 应用：http://localhost:5173  
- 首次打开输入 `MIRRORLY_PASSWORD` 登录

## 部署到 Vercel

详见 **[docs/VERCEL_DEPLOY.md](docs/VERCEL_DEPLOY.md)**。

## 文档

- [docs/VERCEL_DEPLOY.md](docs/VERCEL_DEPLOY.md) — 生产部署与环境变量
- [docs/BACKEND.md](docs/BACKEND.md) — API 说明（历史参考，以 Vercel 版为准）
