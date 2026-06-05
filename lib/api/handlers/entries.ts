/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Entry } from '../../../src/types';
import { seedEntries, USER_ID } from '../../config';
import * as entryDb from '../../db/entries';
import * as convDb from '../../db/conversations';
import * as obsDb from '../../db/observations';
import type { ApiRequest } from '../context';
import { json, parseBody, queryString } from '../context';

export async function handleListEntries(req: ApiRequest) {
  const entries = await entryDb.listEntries({
    search: queryString(req.query, 'search'),
    sort: queryString(req.query, 'sort') || 'newest',
    tag: queryString(req.query, 'tag'),
  });
  return json(entries);
}

export async function handleGetEntry(id: string) {
  const entry = await entryDb.getEntryById(id);
  if (!entry) return json({ error: '认知记录不存在' }, 404);
  return json(entry);
}

export async function handleCreateEntry(req: ApiRequest) {
  const { content, insight, source, tags, emotion } = parseBody<{
    content?: string;
    insight?: string;
    source?: string;
    tags?: string[];
    emotion?: string;
  }>(req.body);

  if (!content || !insight) {
    return json({ error: '观点内容和触动点是必填字段，不能为空' }, 400);
  }

  const entry = await entryDb.createEntry({
    content: String(content).slice(0, 800),
    insight: String(insight).slice(0, 800),
    source: String(source || '').slice(0, 150),
    tags: Array.isArray(tags) ? tags.filter(Boolean).map((t) => String(t).trim()) : [],
    emotion: emotion || '平静',
  });
  return json(entry);
}

export async function handleUpdateEntry(id: string, req: ApiRequest) {
  const { content, insight, source, tags, emotion } = parseBody<{
    content?: string;
    insight?: string;
    source?: string;
    tags?: string[];
    emotion?: string;
  }>(req.body);

  if (!content || !insight) {
    return json({ error: '修正观点内容和触动点不能为空' }, 400);
  }

  const existing = await entryDb.getEntryById(id);
  if (!existing) return json({ error: '认知记录不存在' }, 404);

  const entry = await entryDb.updateEntry(id, {
    content: String(content).slice(0, 800),
    insight: String(insight).slice(0, 800),
    source: String(source || '').slice(0, 150),
    tags: Array.isArray(tags) ? tags.filter(Boolean).map((t) => String(t).trim()) : [],
    emotion: emotion || existing.emotion || '平静',
  });
  return json(entry);
}

export async function handleDeleteEntry(id: string) {
  const ok = await entryDb.deleteEntry(id);
  if (!ok) return json({ error: '需删除的记录未找到' }, 404);
  return json({ success: true, message: '已删除记录并重置AI观察缓存' });
}

export async function handleTags() {
  return json(await entryDb.aggregateTags());
}

export async function handleSeed() {
  const now = new Date().toISOString();
  const entriesToAdd: Entry[] = seedEntries.map((se, idx) => ({
    id: `seed_entry_${Date.now()}_${idx}`,
    userId: USER_ID,
    content: se.content,
    insight: se.insight,
    source: se.source,
    tags: se.tags,
    emotion: se.emotion || '平静',
    createdAt: new Date(Date.now() - idx * 24 * 3600000).toISOString(),
    updatedAt: now,
  }));

  await entryDb.deleteAllEntries();
  await convDb.clearConversation();
  await obsDb.clearObservationCache();
  await obsDb.clearObservationHistory();
  await entryDb.insertEntriesBatch(entriesToAdd);

  await obsDb.seedObservationHistory([
    {
      id: 'history_1',
      stage: '探索期',
      text: '四月份，你初步建立认知空间。针对‘时间管理’与‘心理安全感’产生了广泛好奇，输入卡片的主题呈现分散吸收特征，目前已经成功扎下了知识的探索触手。',
      generatedAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    },
    {
      id: 'history_2',
      stage: '聚焦期',
      text: '五月份，思考重心开始收敛于‘系统思考’及‘MVP设计法则’。你在工作中提炼的主动记录开始发芽，被AI诊断为拥有高度聚焦的高频关注点模式形态。',
      generatedAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
    },
  ]);

  return json({
    success: true,
    message: '示范认知数据已加载并重置缓存',
    entries: entriesToAdd,
  });
}

export async function handleClear() {
  await entryDb.deleteAllEntries();
  await convDb.clearConversation();
  await obsDb.clearObservationCache();
  await obsDb.clearObservationHistory();
  return json({ success: true, message: '数据库内容已重置，回归冷启动状态' });
}
