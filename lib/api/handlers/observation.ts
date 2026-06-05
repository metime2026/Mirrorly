/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getStageForEntryCount } from '../../config';
import * as entryDb from '../../db/entries';
import * as obsDb from '../../db/observations';
import { getGeminiClient, GEMINI_MODEL, isGeminiConfigured } from '../../services/gemini';
import { parseObservationSegments } from '../../services/observation';
import type { ApiRequest } from '../context';
import { json, queryString } from '../context';

export async function handleObservation(req: ApiRequest) {
  const count = await entryDb.countEntries();
  const stage = getStageForEntryCount(count);
  const forceRefresh =
    queryString(req.query, 'refresh') === 'true' ||
    queryString(req.query, 'refresh') === '1';

  if (count < 5) {
    return json({
      type: 'cold',
      entriesCount: count,
      stage,
      text: `🎯 开始积累你的认知\n\n您目前已积累了 **${count}** 条认知记录，继续加油！当您积累满 **5** 条及以上的笔记后，AI 将激活高精度的‘思维模式观察’功能，帮助您自动汇总核心认知热点。请先继续点击“+”记录您的精彩思考吧！`,
      observationPart: `您目前已积累了 ${count} 条认知日记，主题特征正在孕育中。`,
      evidencePart: '需要积累至少 5 条才能激活高敏捷的 AI 模式。当前积累尚未达到阈值。',
      questionPart:
        '回看你目前的输入，触动自己的多是个性思考，还是书籍摘抄？你更希望在这个空间理清本职业务，还是生活认知？',
    });
  }

  const cached = await obsDb.getObservationCache();
  const now = new Date();

  if (
    !forceRefresh &&
    cached &&
    new Date(cached.expired_at) > now &&
    cached.entries_count === count
  ) {
    const segments = parseObservationSegments(cached.text);
    return json({
      type: 'calc',
      entriesCount: count,
      stage,
      text: cached.text,
      observationPart: cached.observation_part || segments.observationPart,
      evidencePart: cached.evidence_part || segments.evidencePart,
      questionPart: cached.question_part || segments.questionPart,
      cached: true,
    });
  }

  if (!isGeminiConfigured()) {
    return json({
      type: 'calc',
      entriesCount: count,
      stage,
      text: '⚠️ Gemini API 未配置。请在 Vercel 环境变量中设置 GEMINI_API_KEY。',
      observationPart: '系统虽检测到有丰富的认知日记，但 Gemini 镜像模型 API 处于待配状态。',
      evidencePart: `当前正在分析您的 ${count} 条真实记录（已被识别至：${stage} 阶段）。`,
      questionPart: '您是否已在 Vercel 项目设置中配置 GEMINI_API_KEY？',
      cached: false,
    });
  }

  try {
    const entries = await entryDb.listAllEntries();
    const ai = getGeminiClient();

    const entriesText = entries
      .map(
        (e, idx) =>
          `记录 #${idx + 1} [标签: ${e.tags.join(',')}] [情绪: ${e.emotion || '未标'}] [来源: ${e.source || '无'}]\n观点: ${e.content}\n触动: ${e.insight}`,
      )
      .join('\n\n');

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
      model: GEMINI_MODEL,
      contents: prompt,
      config: { temperature: 0.7 },
    });

    const summaryText =
      response.text ||
      '### 观察\n未生成足够反射波。\n### 依据\n原始记录分析不充分。\n### 提问\n继续尝试？';
    const segments = parseObservationSegments(summaryText);
    const expiration = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

    await obsDb.upsertObservationCache({
      text: summaryText,
      stage,
      observationPart: segments.observationPart,
      evidencePart: segments.evidencePart,
      questionPart: segments.questionPart,
      entriesCount: count,
      expiredAt: expiration,
    });

    await obsDb.appendObservationHistory({
      stage,
      text: summaryText,
      observationPart: segments.observationPart,
      evidencePart: segments.evidencePart,
      questionPart: segments.questionPart,
    });

    return json({
      type: 'calc',
      entriesCount: count,
      stage,
      text: summaryText,
      observationPart: segments.observationPart,
      evidencePart: segments.evidencePart,
      questionPart: segments.questionPart,
      cached: false,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '未知错误';
    console.error('API Error in AI Observation generator:', err);
    return json({
      type: 'error',
      entriesCount: count,
      stage,
      text: `📡 获取 AI 镜像观察超时。可能是网络异常，您可以稍后刷新 (${message})`,
      observationPart: '加载超时',
      evidencePart: '通信异常阻碍',
      questionPart: '您愿意稍后重试刷新吗？',
    });
  }
}

export async function handleObservationHistory() {
  const rows = await obsDb.listObservationHistory();
  return json(
    rows.map((r) => ({
      id: r.id,
      stage: r.stage,
      text: r.text,
      observationPart: r.observation_part,
      evidencePart: r.evidence_part,
      questionPart: r.question_part,
      generatedAt: new Date(r.generated_at as string | Date).toISOString(),
    })),
  );
}
