# Mirrorly 后端说明

Mirrorly 采用 **Express + Vite 同进程全栈** 架构：开发时 `npm run dev` 会同时启动 API（`/api/*`）与前端热更新。

## 目录结构

```
server/
  app.ts              # Express 应用组装
  config.ts           # 端口、用户 ID、示范种子数据
  db.ts               # JSON 文件持久化（data/database.json）
  routes/
    admin.ts          # 用户、种子数据、清空
    entries.ts        # 认知记录 CRUD + 搜索
    tags.ts           # 标签聚合
    observation.ts    # AI 镜像观察
    chat.ts           # Ask AI 多轮对话
  services/
    gemini.ts         # Gemini 客户端
    observation.ts    # 观察结果解析
server.ts             # 入口：加载环境变量、挂载 Vite、监听端口
```

## 本地运行

1. `npm install`
2. 复制 `.env.example` → `.env.local`，填入 `GEMINI_API_KEY`
3. `npm run dev` → 打开 http://localhost:3000

无 API Key 时：认知记录的增删改查仍可用；**AI 观察**与 **Ask AI** 会返回友好提示。

## 数据存储（当前方案）

| 项目 | 说明 |
|------|------|
| 引擎 | 本地 JSON 文件 |
| 路径 | `data/database.json`（自动创建） |
| 结构 | `entries`、`conversations`、`observations`、`observationHistory` |

适合个人本地使用与演示。若需多用户、云部署或全文检索，见下文「需要你决定的扩展项」。

## API 一览

所有接口前缀：`/api`。前端已对接，**无需改 URL**。

### 认知记录

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/entries` | 列表；query: `search`, `sort`（newest\|oldest）, `tag` |
| GET | `/entries/:id` | 单条详情 |
| POST | `/entries` | 创建；body: `content`, `insight`, `source?`, `tags[]`, `emotion?` |
| PUT | `/entries/:id` | 更新（字段同创建） |
| DELETE | `/entries/:id` | 删除 |

### 标签

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/tags` | `[{ tag, count }]` 按频次降序 |

### AI 镜像观察

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/observation` | 冷启动 / 缓存 / 实时生成；`?refresh=true` 强制刷新 |
| GET | `/observation/history` | 历史观察（最多 10 条，前端可后续接入） |

响应 `type`：`cold`（<5 条）、`calc`、`error`。

阶段 `stage`：记录数 &lt;3 探索期，&lt;8 聚焦期，&lt;15 连接期，否则重构期。

### Ask AI 对话

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/chat` | 当前会话消息列表 |
| POST | `/chat` | 发送；body: `{ messages: Message[] }` |
| POST | `/chat/reset` | 清空会话 |

### 管理 / 演示

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/currentUser` | 当前用户与健康检查 |
| POST | `/seed` | 导入 5 条示范数据 |
| POST | `/clear` | 清空全部数据 |

## 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `GEMINI_API_KEY` | AI 功能必填 | [Google AI Studio](https://aistudio.google.com/apikey) 申请 |
| `GEMINI_MODEL` | 否 | 默认 `gemini-2.0-flash` |
| `PORT` | 否 | 默认 `3000` |
| `MIRRORLY_USER_ID` | 否 | 单用户模式 ID |

## 需要你决定的扩展项（若上生产）

当前后端已满足前端全部调用。若你要部署到公网或多用户，请告诉我你的选择，我可以继续实现：

1. **数据库**：SQLite（轻量） / PostgreSQL（推荐生产） / Supabase
2. **用户体系**：仅本地单用户 / 邮箱登录 / OAuth
3. **部署目标**：Vercel+Serverless / Railway / 自建 VPS / Docker
4. **AI**：继续 Gemini，或改为 OpenAI / 国内大模型（需改 `server/services/gemini.ts`）

你只需回复例如：「PostgreSQL + 邮箱登录 + Railway」，我会给出迁移方案与实现。
