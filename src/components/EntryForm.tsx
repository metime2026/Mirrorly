/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Lightbulb, Link, Tag, X, Save, Trash2 } from 'lucide-react';
import { Entry } from '../types';

interface EntryFormProps {
  entryToEdit?: Entry | null;
  onSave: (data: { content: string; insight: string; source: string; tags: string[]; emotion?: string }) => Promise<void>;
  onCancel: () => void;
  existingTags: string[];
}

export default function EntryForm({ entryToEdit, onSave, onCancel, existingTags }: EntryFormProps) {
  const [content, setContent] = useState('');
  const [insight, setInsight] = useState('');
  const [source, setSource] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [emotion, setEmotion] = useState('平静');
  const [newTagInput, setNewTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showAutoDraftAppliedToast, setShowAutoDraftAppliedToast] = useState(false);

  // Caching Keys
  const DRAFT_KEY_CONTENT = 'mirrorly_draft_content';
  const DRAFT_KEY_INSIGHT = 'mirrorly_draft_insight';
  const DRAFT_KEY_SOURCE = 'mirrorly_draft_source';

  // 1. Initial State Setup
  useEffect(() => {
    if (entryToEdit) {
      setContent(entryToEdit.content);
      setInsight(entryToEdit.insight);
      setSource(entryToEdit.source || '');
      setTags(entryToEdit.tags || []);
      setEmotion(entryToEdit.emotion || '平静');
    } else {
      // Look for local storage draft
      const draftContent = localStorage.getItem(DRAFT_KEY_CONTENT);
      const draftInsight = localStorage.getItem(DRAFT_KEY_INSIGHT);
      const draftSource = localStorage.getItem(DRAFT_KEY_SOURCE);

      if (draftContent || draftInsight || draftSource) {
        setContent(draftContent || '');
        setInsight(draftInsight || '');
        setSource(draftSource || '');
        setTags([]);
        setEmotion('平静');
        setShowAutoDraftAppliedToast(true);
      } else {
        setContent('');
        setInsight('');
        setSource('');
        setTags([]);
        setEmotion('平静');
      }
    }
  }, [entryToEdit]);

  // 2. Draft Auto-Saving (Non-edit mode only)
  useEffect(() => {
    if (!entryToEdit) {
      if (content) localStorage.setItem(DRAFT_KEY_CONTENT, content);
      else localStorage.removeItem(DRAFT_KEY_CONTENT);
    }
  }, [content, entryToEdit]);

  useEffect(() => {
    if (!entryToEdit) {
      if (insight) localStorage.setItem(DRAFT_KEY_INSIGHT, insight);
      else localStorage.removeItem(DRAFT_KEY_INSIGHT);
    }
  }, [insight, entryToEdit]);

  useEffect(() => {
    if (!entryToEdit) {
      if (source) localStorage.setItem(DRAFT_KEY_SOURCE, source);
      else localStorage.removeItem(DRAFT_KEY_SOURCE);
    }
  }, [source, entryToEdit]);

  // Clear drafts after successful persistent submission
  const clearLocalDrafts = () => {
    localStorage.removeItem(DRAFT_KEY_CONTENT);
    localStorage.removeItem(DRAFT_KEY_INSIGHT);
    localStorage.removeItem(DRAFT_KEY_SOURCE);
  };

  const handleAddTag = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanTag = newTagInput.trim().replace(/[#,.\s]/g, '');
    if (cleanTag && !tags.includes(cleanTag) && tags.length < 5) {
      setTags([...tags, cleanTag]);
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleToggleSuggestTag = (tag: string) => {
    if (tags.includes(tag)) {
      setTags(tags.filter(t => t !== tag));
    } else {
      if (tags.length < 5) {
        setTags([...tags, tag]);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !insight.trim()) return;

    try {
      setIsSaving(true);
      await onSave({
        content: content.trim(),
        insight: insight.trim(),
        source: source.trim(),
        tags,
        emotion
      });
      clearLocalDrafts();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const isValid = content.trim().length > 0 && insight.trim().length > 0;
  const isContentExceeded = content.length > 500;
  const isInsightExceeded = insight.length > 500;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-5 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-50">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 font-display">
            {entryToEdit ? '✏️ 修改我的旧学深思' : '📝 记录最近学到的新观点'}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            记录触发灵光的字句，写下对现实的真切解答。
          </p>
        </div>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-50 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {showAutoDraftAppliedToast && (
        <div className="mb-4 bg-amber-50 text-amber-800 border border-amber-100 rounded-xl px-3 py-2 flex justify-between items-center text-xs">
          <span>📱 已为您自动还原了先前的草拟记录。</span>
          <button 
            type="button"
            onClick={() => {
              clearLocalDrafts();
              setContent('');
              setInsight('');
              setSource('');
              setShowAutoDraftAppliedToast(false);
            }} 
            className="font-semibold text-amber-900 underline hover:text-amber-700 ml-2"
          >
            丢弃并清空
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Content Field */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
            <BookOpen className="w-4 h-4 text-primary" />
            核心观点内容 <span className="text-rose-500">*</span>
          </label>
          <textarea
            required
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="如：‘早期的抽象是万恶之源。过度模块化会锁死弹性。’（不超过500字）"
            className={`w-full p-3 text-[15px] border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary bg-gray-50/50 placeholder-gray-400 text-gray-800 transition-all ${
              isContentExceeded ? 'border-red-400 bg-red-50/5' : 'border-gray-200'
            }`}
          />
          <div className="flex justify-end mt-1">
            <span className={`text-[11px] font-mono ${isContentExceeded ? 'text-rose-600 font-bold' : 'text-gray-400'}`}>
              {content.length}/500 {isContentExceeded && '⚠️ 已超出字数上限'}
            </span>
          </div>
        </div>

        {/* Insight Field */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            为什么打动你？（触动点） <span className="text-rose-500">*</span>
          </label>
          <textarea
            required
            rows={3}
            value={insight}
            onChange={(e) => setInsight(e.target.value)}
            placeholder="如：回想自己以前做微服务架构，其实项目根本没人访问。极简单体结构才是MVP的王道。（不超过500字）"
            className={`w-full p-3 text-[15px] border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary bg-gray-50/50 placeholder-gray-400 text-gray-800 transition-all ${
              isInsightExceeded ? 'border-red-400 bg-red-50/5' : 'border-gray-200'
            }`}
          />
          <div className="flex justify-end mt-1">
            <span className={`text-[11px] font-mono ${isInsightExceeded ? 'text-rose-600 font-bold' : 'text-gray-400'}`}>
              {insight.length}/500 {isInsightExceeded && '⚠️ 已超出字数上限'}
            </span>
          </div>
        </div>

        {/* Source Field */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
            <Link className="w-4 h-4 text-[#8C8C73]" />
            观点来源 (可选)
          </label>
          <input
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="书本名称、播客、公众号名称"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#5A5A40] focus:border-[#5A5A40] bg-gray-50/50 text-sm text-gray-800 transition-all font-sans"
          />
        </div>

        {/* Emotion Selector Field */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
            <span className="text-sm">🎭</span>
            记录该认知发生时的情绪状态 (可选)
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: '平静 😌', value: '平静', color: 'border-emerald-200 text-emerald-800' },
              { label: '好奇 🤔', value: '好奇', color: 'border-amber-200 text-amber-800' },
              { label: '兴奋 😄', value: '兴奋', color: 'border-indigo-200 text-indigo-800' },
              { label: '焦虑 😟', value: '焦虑', color: 'border-rose-200 text-rose-800' }
            ].map(item => (
              <button
                key={item.value}
                type="button"
                onClick={() => setEmotion(item.value)}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-sans font-medium transition-all cursor-pointer ${
                  emotion === item.value
                    ? 'bg-[#F2EDE4] border-[#5A5A40] text-[#5A5A40] font-bold shadow-xs'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tags Section */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
            <Tag className="w-4 h-4 text-indigo-500" />
            选择分类标签 (可选，最多5个)
          </label>
          
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {tags.map(t => (
              <span 
                key={t}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary font-medium font-sans"
              >
                #{t}
                <button 
                  type="button" 
                  onClick={() => handleRemoveTag(t)}
                  className="text-[#8C8479] hover:text-primary rounded p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          {/* Quick recommendations */}
          {existingTags.length > 0 && (
            <div className="mb-3">
              <span className="text-[11px] text-gray-400 block mb-1">常用备选标签：</span>
              <div className="flex flex-wrap gap-1">
                {existingTags.map(tag => {
                  const selected = tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleToggleSuggestTag(tag)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                        selected 
                          ? 'bg-primary border-primary text-white font-medium' 
                          : 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      #{tag}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Custom tag input append */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              placeholder="新增自定义标签..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              className="flex-1 px-3 py-1.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary bg-gray-50/50 text-xs text-gray-800"
            />
            <button
              type="button"
              onClick={() => handleAddTag()}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700 rounded-xl text-xs font-medium cursor-pointer transition-colors"
            >
              添加标签
            </button>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-3 border-t border-gray-50 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-600 rounded-xl transition-all cursor-pointer"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={!isValid || isSaving || isContentExceeded || isInsightExceeded}
            className={`px-4 py-2 font-medium text-sm text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ${
              isValid && !isSaving && !isContentExceeded && !isInsightExceeded
                ? 'bg-primary hover:bg-primary-hover active:scale-98' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                正在入库...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                确定保存在库
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
