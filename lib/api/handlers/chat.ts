/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Message } from '../../../src/types';
import * as entryDb from '../../db/entries';
import * as convDb from '../../db/conversations';
import { getGeminiClient, GEMINI_MODEL, isGeminiConfigured } from '../../services/gemini';
import type { ApiRequest } from '../context';
import { json, parseBody } from '../context';

export async function handleGetChat() {
  return json(await convDb.getMessages());
}

export async function handleResetChat() {
  await convDb.clearConversation();
  return json({ success: true });
}

export async function handlePostChat(req: ApiRequest) {
  const { messages } = parseBody<{ messages?: Message[] }>(req.body);
  if (!Array.isArray(messages) || messages.length === 0) {
    return json({ error: '消息历史记录未找到' }, 400);
  }

  if (!isGeminiConfigured()) {
    return json(
      {
        error: 'MISSING_KEY',
        message: 'GEMINI_API_KEY 未配置。请在 Vercel 环境变量中设置。',
      },
      500,
    );
  }

  try {
    const entries = await entryDb.listAllEntries();
    const ai = getGeminiClient();

    const journalSummary = entries
      .map(
        (e, idx) =>
          `[背景记录 #${idx + 1}] [书源: ${e.source || '未注明'}] [标签: ${e.tags.join('/')}]\n原本观点: ${e.content}\n他的触动: ${e.insight}`,
      )
      .join('\n\n');

    const systemPrompt = `你是一个反思型思维助手。用户会提出困境或问题，你的职责是通过提问来引导用户进行底层认知解构，而不是直接代替他给出建议。

[核心规则]
1. 你的回复严禁使用 "你应该..."、"我建议你..."、"听我的..."、"正确的做法是..." 等命令式和指令式表达。
2. 每一个回复必须以好奇且深刻的‘问题螺旋’形式回应，引导用户自己寻求深层答案。
3. 必须通过引述用户先前面学的学识观点（如用户的阅读背景和工作感悟）来串联启发！建立起‘他拥有的认知’与‘他正面临的现实’之间的镜像关联。
4. 回复控制在150字以内，保持高敏捷度。
5. 每次提尾声需有一个充满张力的启发性短问题。

[用户的历史认知记录]
${journalSummary}`;

    const formattedContents = messages.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: formattedContents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.85,
      },
    });

    const aiOutput =
      response.text || '我正仔细聆听并阅读着您的思考背景，请继续与我深入反思。';

    const now = new Date().toISOString();
    const updatedMessages: Message[] = [
      ...messages.map((m) => ({
        role: m.role as 'user' | 'model',
        content: m.content,
        timestamp: m.timestamp || now,
      })),
      { role: 'model', content: aiOutput, timestamp: now },
    ];

    await convDb.saveMessages(updatedMessages);

    return json({
      role: 'model',
      content: aiOutput,
      timestamp: now,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '网络连接超时';
    console.error('API Error in Ask AI dialogue:', err);
    return json(
      { error: 'AI_FAILED', message: `AI 互动遇到了通信阻碍: ${message}` },
      500,
    );
  }
}
