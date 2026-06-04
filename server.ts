/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

// --- Types ---
import { Entry, Conversation, Message, Observation } from './src/types';

const app = express();
const PORT = 3000;
app.use(express.json());

// --- Persistent File Database ---
const DB_PATH = path.join(process.cwd(), 'data', 'database.json');

function readDB() {
  try {
    if (!fs.existsSync(path.dirname(DB_PATH))) {
      fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    }
    if (!fs.existsSync(DB_PATH)) {
      const initial = { entries: [], conversations: [], observations: {}, observationHistory: [] };
      fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
      return initial;
    }
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    const parsed = JSON.parse(data);
    if (!parsed.observationHistory) {
      parsed.observationHistory = [];
    }
    return parsed;
  } catch (err) {
    console.error('Error reading DB data, fallback to empty:', err);
    return { entries: [], conversations: [], observations: {}, observationHistory: [] };
  }
}

function writeDB(data: { entries: Entry[]; conversations: Conversation[]; observations: Record<string, Observation>; observationHistory?: any[] }) {
  try {
    if (!data.observationHistory) {
      data.observationHistory = [];
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing DB data:', err);
  }
}

// --- Initialize Database & Mock Helpers ---
const seedEntries: Array<Omit<Entry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>> = [
  {
    content: "《第五项修炼》提到：‘要想系统性思考，我们必须学会看清整体。’ 不要只看到局部因果（事件），而要看到长期的周期和结构模式。解决局部往往会引发系统其他地方的连锁反弹。",
    insight: "产品开发中经常有‘拆东墙补西墙’的问题。比如为了解决眼前的报错，堆叠大量零散逻辑而破坏了底层的统一状态模型。我们在写代码前应该多花10分钟推演状态流向图。",
    source: "书籍·彼得·圣吉《第五项修炼》",
    tags: ["系统思考", "产品设计", "架构思维"],
    emotion: "好奇"
  },
  {
    content: "著名的卡片盒笔记法（Zettelkasten）核心在于：每一张卡片应当只记录一个原子的想法（Atomicity），并且通过语义相连编织成蛛网状。分类和层级是静止的，唯有网状的双向链接是流动的知识生态系统。",
    insight: "我以前做笔记全在堆长文本，结果‘记完就废’。原子的认知记录容易提取，而且当把多个卡片拼插组合时，会碰撞出意想不到的主题火花。Mirrorly正是这种原子反思的物理实现。",
    source: "书籍·申克·阿伦斯《卡片盒笔记法》",
    tags: ["卡片盒", "认知升级", "高效工具"],
    emotion: "兴奋"
  },
  {
    content: "在开发软件时，早期的抽象是万恶之源。过早、过度的模块化架构会锁死设计的灵活性，使系统由于承载了未来不确定功能而负重前行。‘先让它跑起来，再让它完美’（Make it work, make it right, make it fast）。",
    insight: "回想上个项目重构时的绝望——为了并不存在的‘高并发’做了全套多集群微服务划分，结果在需求变更时改一行代码要通知4个人。极简、敏捷的单体和直观布局才是MVP的王道。",
    source: "播客·不合时宜《关于过度抽象的反思》",
    tags: ["极简主义", "架构思维", "MVP法则"],
    emotion: "平静"
  },
  {
    content: "领导力的核心是‘建立心理安全感（Psychological Safety）’。当团队成员能够坦诚说出‘我不会’、‘我搞砸了’或者提出不同的异见而不必担心被排挤或看低时，这个团队的纠错和协作效率才最高。",
    insight: "今天晨会上小王勇敢指出了设计原型的体验逻辑缺陷。这在以往官僚氛围高昂的团队会被评为‘反骨’。我要在晨会制度里增加一个‘每周吐槽奖’，给打破虚伪和谐的成员发一颗彩虹糖。",
    source: "文章·Amy Edmondson《无畏的组织》",
    tags: ["团队合作", "领导力", "心理安全感"],
    emotion: "好奇"
  },
  {
    content: "时间箱（Time Boxing）绝对是克服完美主义和拖延症的最佳手段。将任务划分成坚实的30分钟区块，规定在此区块内只专注于写出初稿，不纠结标点、修辞或完美逻辑。时间到即强制进入下一阶段。",
    insight: "以往写文档总纠结头两个字，耗费数小时。最近使用30分钟时间箱写方案，虽然第一版很粗糙，但大脑有完整的成型。先写出50分草稿的人更容易写出100分好作品。",
    source: "文章·极客时间《现代知识管理实践》",
    tags: ["时间管理", "成长习惯", "高效工具"],
    emotion: "平静"
  }
];

// --- Lazy Initializer for Gemini AI ---
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is missing in secrets or .env.');
    }
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// --- API Endpoints ---

// Mock user ID for local environment sessions
const USER_ID = "user_default";

// 1. Get current mock user settings / health check
app.get('/api/currentUser', (req, res) => {
  res.json({
    id: USER_ID,
    email: "metime2021@gmail.com",
    nickname: "Metime",
    isApiKeyConfigured: !!process.env.GEMINI_API_KEY
  });
});

// Seed sample data to simulate established dataset easily
app.post('/api/seed', (req, res) => {
  const db = readDB();
  const now = new Date().toISOString();
  
  const entriesToAdd: Entry[] = seedEntries.map((se, idx) => ({
    id: `seed_entry_${Date.now()}_${idx}`,
    userId: USER_ID,
    content: se.content,
    insight: se.insight,
    source: se.source,
    tags: se.tags,
    emotion: se.emotion || "平静",
    createdAt: new Date(Date.now() - idx * 24 * 3600000).toISOString(), // staggered dates
    updatedAt: now
  }));

  db.entries = entriesToAdd;
  db.conversations = [];
  db.observations = {}; // Clear caches to trigger recalculated summaries
  db.observationHistory = [
    {
      id: "history_1",
      stage: "探索期",
      text: "四月份，你初步建立认知空间。针对‘时间管理’与‘心理安全感’产生了广泛好奇，输入卡片的主题呈现分散吸收特征，目前已经成功扎下了知识的探索触手。",
      generatedAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
    },
    {
      id: "history_2",
      stage: "聚焦期",
      text: "五月份，思考重心开始收敛于‘系统思考’及‘MVP设计法则’。你在工作中提炼的主动记录开始发芽，被AI诊断为拥有高度聚焦的高频关注点模式形态。",
      generatedAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString()
    }
  ];
  writeDB(db);
  
  res.json({ success: true, message: "示范认知数据已加载并重置缓存", entries: db.entries });
});

// Clear all database files (Reset to Cold Start state)
app.post('/api/clear', (req, res) => {
  const db = { entries: [], conversations: [], observations: {}, observationHistory: [] };
  writeDB(db);
  res.json({ success: true, message: "数据库内容已重置，回归冷启动状态" });
});

// 2. Entries listing with Realtime PostgreSQL-like FTS Search, Tag filter, Sort
app.get('/api/entries', (req, res) => {
  const db = readDB();
  let result = [...db.entries];

  const search = (req.query.search as string || '').toLowerCase().trim();
  const sort = req.query.sort as string || 'newest'; // newest | oldest
  const tag = req.query.tag as string || '';

  // Apply Tag Filter
  if (tag && tag !== '全部') {
    result = result.filter(e => e.tags.includes(tag));
  }

  // Apply Full Text Mimic Search
  if (search) {
    result = result.filter(e => 
      e.content.toLowerCase().includes(search) || 
      e.insight.toLowerCase().includes(search) || 
      (e.source && e.source.toLowerCase().includes(search))
    );
  }

  // Apply Sort
  if (sort === 'oldest') {
    result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  } else {
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  res.json(result);
});

// Get single entry detail
app.get('/api/entries/:id', (req, res) => {
  const db = readDB();
  const entry = db.entries.find(e => e.id === req.params.id);
  if (!entry) {
    return res.status(404).json({ error: "认知记录不存在" });
  }
  res.json(entry);
});

// 3. Create entry
app.post('/api/entries', (req, res) => {
  const { content, insight, source, tags, emotion } = req.body;
  if (!content || !insight) {
    return res.status(400).json({ error: "观点内容和触动点是必填字段，不能为空" });
  }

  const db = readDB();
  const now = new Date().toISOString();
  
  const newEntry: Entry = {
    id: `entry_${Date.now()}`,
    userId: USER_ID,
    content: content.slice(0, 800),
    insight: insight.slice(0, 800),
    source: (source || '').slice(0, 150),
    tags: Array.isArray(tags) ? tags.filter(Boolean).map(t => String(t).trim()) : [],
    emotion: emotion || "平静",
    createdAt: now,
    updatedAt: now
  };

  db.entries.unshift(newEntry);
  db.observations = {}; // Invalidate caching on add to refresh observations
  writeDB(db);

  res.json(newEntry);
});

// 4. Update entry
app.put('/api/entries/:id', (req, res) => {
  const { content, insight, source, tags, emotion } = req.body;
  if (!content || !insight) {
    return res.status(400).json({ error: "修正观点内容和触动点不能为空" });
  }

  const db = readDB();
  const entryIdx = db.entries.findIndex(e => e.id === req.params.id);
  
  if (entryIdx === -1) {
    return res.status(404).json({ error: "认知记录不存在" });
  }

  const updatedEntry: Entry = {
    ...db.entries[entryIdx],
    content: content.slice(0, 800),
    insight: insight.slice(0, 800),
    source: (source || '').slice(0, 150),
    tags: Array.isArray(tags) ? tags.filter(Boolean).map(t => String(t).trim()) : [],
    emotion: emotion || db.entries[entryIdx].emotion || "平静",
    updatedAt: new Date().toISOString()
  };

  db.entries[entryIdx] = updatedEntry;
  db.observations = {}; // Invalidate caching on update
  writeDB(db);

  res.json(updatedEntry);
});

// 5. Delete entry
app.delete('/api/entries/:id', (req, res) => {
  const db = readDB();
  const filtered = db.entries.filter(e => e.id !== req.params.id);
  
  if (filtered.length === db.entries.length) {
    return res.status(404).json({ error: "需删除的记录未找到" });
  }

  db.entries = filtered;
  db.observations = {}; // Invalidate cache on delete
  writeDB(db);

  res.json({ success: true, message: "已删除记录并重置AI观察缓存" });
});

// 6. Aggregate tags
app.get('/api/tags', (req, res) => {
  const db = readDB();
  const tagsMap: Record<string, number> = {};
  
  db.entries.forEach(e => {
    (e.tags || []).forEach(tag => {
      tagsMap[tag] = (tagsMap[tag] || 0) + 1;
    });
  });

  const sortedTags = Object.entries(tagsMap)
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => ({ tag, count }));

  res.json(sortedTags);
});

// 7. AI Observation cached generator
app.get('/api/observation', async (req, res) => {
  const db = readDB();
  const count = db.entries.length;

  const stage = count < 3 ? '探索期' : count < 8 ? '聚焦期' : count < 15 ? '连接期' : '重构期';

  // Rule 4.4: Cold Start treatment (< 5 entries)
  if (count < 5) {
    return res.json({
      type: 'cold',
      entriesCount: count,
      stage,
      text: `🎯 开始积累你的认知\n\n您目前已积累了 **${count}** 条认知记录，继续加油！当您积累满 **5** 条及以上的笔记后，AI 将激活高精度的‘思维模式观察’功能，帮助您自动汇总核心认知热点。请先继续点击“+”记录您的精彩思考吧！`,
      observationPart: `您目前已积累了 ${count} 条认知日记，主题特征正在孕育中。`,
      evidencePart: "需要积累至少 5 条才能激活高敏捷的 AI 模式。当前积累尚未达到阈值。",
      questionPart: "回看你目前的输入，触动自己的多是个性思考，还是书籍摘抄？你更希望在这个空间理清本职业务，还是生活认知？"
    });
  }

  // Parse segments helper
  function parseSegments(text: string) {
    let observationPart = "";
    let evidencePart = "";
    let questionPart = "";

    const obsIndex = text.indexOf('### 观察');
    const eviIndex = text.indexOf('### 依据');
    const qIndex = text.indexOf('### 提问');

    if (obsIndex !== -1 && eviIndex !== -1 && qIndex !== -1) {
      observationPart = text.slice(obsIndex + 6, eviIndex).trim();
      evidencePart = text.slice(eviIndex + 6, qIndex).trim();
      questionPart = text.slice(qIndex + 6).trim();
    } else {
      // Elegant paragraph fallback
      const paragraphs = text.split('\n').filter(p => p.trim());
      if (paragraphs.length >= 3) {
        observationPart = paragraphs[0];
        evidencePart = paragraphs[1];
        questionPart = paragraphs.slice(2).join('\n');
      } else {
        observationPart = text;
        evidencePart = "基于您近期记下的多个深层观点及打标分类。";
        questionPart = "在你刚刚写下的那些感叹和摘抄背后，反映了你现阶段怎样的核心痛点或发展方向？";
      }
    }

    // Clean prefix titles if present
    observationPart = observationPart.replace(/^(观察[:：\s]*)/, '').replace(/^([:：\s]*)/, '').trim();
    evidencePart = evidencePart.replace(/^(依据[:：\s]*)/, '').replace(/^([:：\s]*)/, '').trim();
    questionPart = questionPart.replace(/^(提问[:：\s]*)/, '').replace(/^([:：\s]*)/, '').trim();

    return { observationPart, evidencePart, questionPart };
  }

  // Check Caching (24h)
  const cached = db.observations[USER_ID];
  const now = new Date();
  if (cached && new Date(cached.expiredAt) > now && cached.entriesCount === count) {
    const segments = parseSegments(cached.text);
    return res.json({
      type: 'calc',
      entriesCount: count,
      stage,
      text: cached.text,
      observationPart: cached.observationPart || segments.observationPart,
      evidencePart: cached.evidencePart || segments.evidencePart,
      questionPart: cached.questionPart || segments.questionPart,
      cached: true
    });
  }

  // No API key - return elegant fallback
  if (!process.env.GEMINI_API_KEY) {
    const summaryText = "⚠️ Gemini API 未配置。无法生成完整的 AI 认知观察。请检查本地 Secrets；您也可以点击右上角‘一键导入数据’体验满配视觉效果！";
    const segments = {
      observationPart: "系统虽检测到有丰富的认知日记，但 Gemini 镜像模型 API 处于待配状态。",
      evidencePart: `当前正在分析您的 ${count} 条真实记录（已被识别至：${stage} 阶段）。`,
      questionPart: "您是否考虑绑定个人 API Key 去触发深层卡片碰撞分析？"
    };

    return res.json({
      type: 'calc',
      entriesCount: count,
      stage,
      text: summaryText,
      ...segments,
      cached: false
    });
  }

  // Generate live summary using gemini-3.5-flash
  try {
    const ai = getGeminiClient();

    // Context formatting
    const entriesText = db.entries.map((e, idx) => 
      `记录 #${idx+1} [标签: ${e.tags.join(',')}] [情绪: ${e.emotion || '未标'}] [来源: ${e.source || '无'}]\n观点: ${e.content}\n触动: ${e.insight}`
    ).join('\n\n');

    const prompt = `你是用户的认知镜像。任务是基于用户记录（已归纳为 ${stage}），指明他们最近的思维模式。
    
[输出结构化约束（非常重要，必须严格按照如下结构输出，不能有其他废话，方便我程序拆解）]
### 观察
在此处精简写下你观察到的：一到两个最主要的思维模式和主题焦点（例如最近高度关注软件抽象与复杂度管理）。
### 依据
在此处精简列出支撑你这个观察的依据（例如引用了3张包含“系统思考”、“MVP”的原始手札标签和书籍观点）。
### 提问
在此处面向用户提出一个好奇、温和、旨在破局认知惯性的深度疑问。

[语气]
友善温暖、好奇提问、切忌生硬说教。

[用户记录]
${entriesText}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        temperature: 0.7,
      }
    });

    const summaryText = response.text || "### 观察\n未生成足够反射波。\n### 依据\n原始记录分析不充分。\n### 提问\n继续尝试？";
    const segments = parseSegments(summaryText);

    // Set cache expiration for 24h
    const expiration = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const newObs: Observation = {
      userId: USER_ID,
      text: summaryText,
      stage,
      observationPart: segments.observationPart,
      evidencePart: segments.evidencePart,
      questionPart: segments.questionPart,
      generatedAt: now.toISOString(),
      expiredAt: expiration,
      entriesCount: count
    };

    db.observations[USER_ID] = newObs;

    // Save to historical logs as well
    if (!db.observationHistory) {
      db.observationHistory = [];
    }
    // Prevent duplicate logs on exact same text/count
    const duplicate = db.observationHistory.some((h: any) => h.text === summaryText);
    if (!duplicate) {
      db.observationHistory.unshift({
        id: `obs_hist_${Date.now()}`,
        stage,
        text: summaryText,
        observationPart: segments.observationPart,
        evidencePart: segments.evidencePart,
        questionPart: segments.questionPart,
        generatedAt: now.toISOString()
      });
      // Limit to 10 stored records
      if (db.observationHistory.length > 10) {
        db.observationHistory.pop();
      }
    }

    writeDB(db);

    res.json({
      type: 'calc',
      entriesCount: count,
      stage,
      text: summaryText,
      observationPart: segments.observationPart,
      evidencePart: segments.evidencePart,
      questionPart: segments.questionPart,
      cached: false
    });

  } catch (err: any) {
    console.error('API Error in AI Observation generator:', err);
    res.json({
      type: 'error',
      entriesCount: count,
      stage,
      text: `📡 获取 AI 镜像观察超时。可能是网络异常，您可以稍后刷新 (${err?.message || '未知错误'})`,
      observationPart: "加载超时",
      evidencePart: "通信异常阻碍",
      questionPart: "您愿意检查本地防火墙并重试刷新吗？"
    });
  }
});

// Observation history endpoint
app.get('/api/observation/history', (req, res) => {
  const db = readDB();
  res.json(db.observationHistory || []);
});

// 8. Ask AI Session Conversation Router
app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "消息历史记录未找到" });
  }

  const db = readDB();
  const entryCount = db.entries.length;

  // Ask AI is always open, even with less than 3 entries. 
  // We feed whatever background we have (even empty) to the AI to answer.

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({
      error: "MISSING_KEY",
      message: "服务器上的 GEMINI_API_KEY environment variable is required. Please set up API Key in the Secrets pane."
    });
  }

  try {
    const ai = getGeminiClient();

    // 1. Build cognitive backgrounds
    const journalSummary = db.entries.map((e, idx) => 
      `[背景记录 #${idx+1}] [书源: ${e.source || '未注明'}] [标签: ${e.tags.join('/')}]\n原本观点: ${e.content}\n他的触动: ${e.insight}`
    ).join('\n\n');

    const systemPrompt = `你是一个反思型思维助手。用户会提出困境或问题，你的职责是通过提问来引导用户进行底层认知解构，而不是直接代替他给出建议。

[核心规则]
1. 你的回复严禁使用 "你应该..."、"我建议你..."、"听我的..."、"正确的做法是..." 等命令式和指令式表达。
2. 每一个回复必须以好奇且深刻的‘问题螺旋’形式回应，引导用户自己寻求深层答案。
3. 必须通过引述用户先前面学的学识观点（如用户的阅读背景和工作感悟）来串联启发！建立起‘他拥有的认知’与‘他正面临的现实’之间的镜像关联。
4. 回复控制在150字以内，保持高敏捷度。
5. 每次提尾声需有一个充满张力的启发性短问题。

[用户的历史认知记录]
${journalSummary}`;

    // Convert messages for GoogleGenAI contents array
    // Map 'user' -> 'user' and 'model' -> 'model'
    const formattedContents = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: formattedContents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.85
      }
    });

    const aiOutput = response.text || "我正仔细聆听并阅读着您的思考背景，请继续与我深入反思。";
    
    // Auto sync state in db
    const now = new Date().toISOString();
    const updatedMessages: Message[] = [
      ...messages.map(m => ({ role: m.role as 'user' | 'model', content: m.content, timestamp: m.timestamp || now })),
      { role: 'model', content: aiOutput, timestamp: now }
    ];

    db.conversations = [
      {
        id: `conv_${USER_ID}`,
        userId: USER_ID,
        messages: updatedMessages,
        createdAt: now,
        updatedAt: now
      }
    ];
    writeDB(db);

    res.json({
      role: "model",
      content: aiOutput,
      timestamp: now
    });

  } catch (err: any) {
    console.error('API Error in Ask AI dialogue:', err);
    res.status(500).json({ error: "AI_FAILED", message: `AI 互动遇到了通信阻碍 ($err): ${err?.message || '网络连接超时'}` });
  }
});

// Clear conversations session explicitly
app.post('/api/chat/reset', (req, res) => {
  const db = readDB();
  db.conversations = [];
  writeDB(db);
  res.json({ success: true });
});

// Get existing active chat logs for current user
app.get('/api/chat', (req, res) => {
  const db = readDB();
  const conv = db.conversations.find(c => c.userId === USER_ID);
  res.json(conv ? conv.messages : []);
});


// --- Vite Middleware Placement ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Mirrorly Backend] FULLSTACK RUNNING ON http://localhost:${PORT}`);
  });
}

startServer();
