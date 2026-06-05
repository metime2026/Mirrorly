/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, SlidersHorizontal, BookOpen, Lightbulb, Link, 
  Trash2, Edit, Calendar, Tag, ChevronRight, X, AlertTriangle, Plus, Clock 
} from 'lucide-react';
import { Entry } from '../types';
import { apiFetch } from '../lib/api';

interface LibraryViewProps {
  entries: Entry[];
  onEditEntry: (entry: Entry) => void;
  onDeleteEntry: (id: string) => Promise<void>;
  onOpenAddModal: () => void;
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function LibraryView({ 
  entries, 
  onEditEntry, 
  onDeleteEntry, 
  onOpenAddModal,
  onToast 
}: LibraryViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('全部');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [filteredEntries, setFilteredEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTags, setActiveTags] = useState<Array<{ tag: string; count: number }>>([]);

  // Detail Drawer Target
  const [inspectEntry, setInspectEntry] = useState<Entry | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // 1. Fetch tags aggregation from the server
  const fetchTags = async () => {
    try {
      const res = await apiFetch('/api/tags');
      const data = await res.json();
      setActiveTags(data);
    } catch (err) {
      console.error(err);
    }
  };

  // 2. Query matches from server with 300ms mimics debounce logic
  const performSearch = async () => {
    try {
      setLoading(true);
      const url = `/api/entries?search=${encodeURIComponent(searchQuery)}&sort=${sortBy}&tag=${encodeURIComponent(selectedTag)}`;
      const res = await apiFetch(url);
      const data = await res.json();
      setFilteredEntries(data);
    } catch (err) {
      console.error(err);
      onToast('加载记录库失败，请检查连接。', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Triggers search when filters modify
  useEffect(() => {
    const handler = setTimeout(() => {
      performSearch();
    }, 250);

    return () => clearTimeout(handler);
  }, [searchQuery, selectedTag, sortBy, entries.length]);

  useEffect(() => {
    fetchTags();
  }, [entries.length]);

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(id);
  };

  const handleConfirmDelete = async (id: string) => {
    try {
      await onDeleteEntry(id);
      setShowDeleteConfirm(null);
      if (inspectEntry?.id === id) {
        setInspectEntry(null);
      }
      onToast('✓ 认知日记删除成功', 'success');
    } catch (err) {
      onToast('删除失败，请稍后重试', 'error');
    }
  };

  const handleCardClick = (entry: Entry) => {
    setInspectEntry(entry);
  };

  return (
    <div className="space-y-4 max-w-lg mx-auto pb-10">
      {/* Header Panel */}
      <div>
        <h2 className="text-xl font-bold font-display text-gray-900">认知记录馆</h2>
        <p className="text-xs text-gray-400">检索在库学术见解，翻看您记录的每一束高光</p>
      </div>

      {/* Floating Query Container */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-3xs space-y-3">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索你积累的观点、触动或来源书目..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm text-gray-800 transition-all placeholder-gray-400"
          />
        </div>

        {/* Filter / Sort Row */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3 text-slate-400" />
            排序方式：
          </span>
          <div className="flex gap-1.5">
            <button
              onClick={() => setSortBy('newest')}
              className={`text-[11px] font-sans font-medium px-3 py-1 rounded-lg transition-all cursor-pointer ${
                sortBy === 'newest'
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              最新记录优先
            </button>
            <button
              onClick={() => setSortBy('oldest')}
              className={`text-[11px] font-sans font-medium px-3 py-1 rounded-lg transition-all cursor-pointer ${
                sortBy === 'oldest'
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              最早记录优先
            </button>
          </div>
        </div>
      </div>

      {/* Interactive horizontal tag chip bar */}
      <div className="overflow-x-auto scrollbar-none flex items-center gap-1.5 py-1 -mx-4 px-4 mask-right">
        <button
          onClick={() => setSelectedTag('全部')}
          className={`px-3 py-1.5 rounded-full text-xs font-sans font-medium transition-all cursor-pointer flex-shrink-0 border ${
            selectedTag === '全部'
              ? 'bg-slate-900 border-slate-950 text-white'
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          全部 ({entries.length})
        </button>
        {activeTags.map(({ tag, count }) => (
          <button
            key={tag}
            onClick={() => setSelectedTag(tag)}
            className={`px-3 py-1.5 rounded-full text-xs font-sans font-medium transition-all cursor-pointer flex-shrink-0 border flex items-center gap-1 ${
              selectedTag === tag
                ? 'bg-primary border-primary-hover text-white font-semibold'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            #{tag} <span className="opacity-60 text-[10px]">({count})</span>
          </button>
        ))}
      </div>

      {/* List Container Grid */}
      {loading ? (
        /* Skeleton Cards */
        <div className="space-y-3">
          {[1, 2, 3].map(n => (
            <div key={n} className="bg-white p-5 border border-gray-100 rounded-2xl space-y-3 shadow-3xs animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-5/6" />
              <div className="h-4 bg-gray-100 rounded" />
              <div className="h-3 bg-gray-50 rounded w-1/2 pt-2" />
            </div>
          ))}
        </div>
      ) : filteredEntries.length === 0 ? (
        /* Empty/No outcomes States */
        <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center space-y-4 shadow-3xs">
          <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mx-auto">
            {searchQuery ? '🔍' : '📝'}
          </div>
          <div className="space-y-1.5">
            <h4 className="text-sm font-semibold text-gray-800">
              {searchQuery ? '未找到匹配结果' : '积累库尚无藏书记录'}
            </h4>
            <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
              {searchQuery 
                ? '请尝试换一个更简短的手札关键词进行检索，或者点击清空搜索框' 
                : '您的认知日记还是空的，点击下方按钮，马上积累您的第一块思维拼图吧！'}
            </p>
          </div>
          {!searchQuery ? (
            <button
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover transition-all text-white text-xs font-semibold rounded-xl cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              添加第一个观点
            </button>
          ) : (
            <button
              onClick={() => setSearchQuery('')}
              className="px-3.5 py-1.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 text-xs font-semibold transition-all cursor-pointer"
            >
              清除搜索框并返回
            </button>
          )}
        </div>
      ) : (
        /* Standard card list render */
        <div className="space-y-3 font-sans">
          {filteredEntries.map(entry => {
            const truncatedContent = entry.content.length > 95 
              ? `${entry.content.slice(0, 95)}...` 
              : entry.content;

            return (
              <motion.div
                key={entry.id}
                layoutId={`card_${entry.id}`}
                onClick={() => handleCardClick(entry)}
                className="bg-white border border-[#EBE3D9] p-5 rounded-3xl hover:border-primary/40 transition-all shadow-3xs hover:shadow-2xs cursor-pointer space-y-3 relative group"
              >
                {/* Book & Timestamp header */}
                <div className="flex items-center justify-between text-[11px] text-gray-400 pr-1">
                  <span className="flex items-center gap-1 font-medium text-slate-500 max-w-[180px] truncate">
                    {entry.source ? (
                      <>
                        <BookOpen className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        {entry.source}
                      </>
                    ) : '自悟认知'}
                  </span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {entry.emotion && (
                      <span className="text-[10px] bg-[#F2EDE4] border border-[#EBE3D9] text-[#5A5A40] px-1.5 py-0.5 rounded-md font-sans font-semibold">
                        {entry.emotion}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-[10px]">
                      <Clock className="w-3 h-3 text-slate-300 animate-pulse" />
                      {new Date(entry.createdAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* Main content quote */}
                <p className="text-[14px] leading-relaxed text-gray-800 font-sans font-medium select-none">
                  “ {truncatedContent} ”
                </p>

                {/* Sub insight card */}
                <div className="p-3 bg-[#F8F9FA] rounded-xl border border-gray-50/50 flex gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-600 leading-relaxed font-sans select-none">
                    <span className="font-semibold text-gray-700">启发触动：</span>
                    {entry.insight.length > 70 ? `${entry.insight.slice(0, 70)}...` : entry.insight}
                  </p>
                </div>

                {/* Bottom line: labels & actions */}
                <div className="flex justify-between items-center pt-1.5 border-t border-gray-50">
                  <div className="flex flex-wrap gap-1 max-w-[250px]">
                    {(entry.tags || []).slice(0, 3).map(tag => (
                      <span key={tag} className="text-[10px] bg-slate-50 text-slate-500 border border-slate-100/60 px-2 py-0.5 rounded-full font-medium">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {/* Operational actions targets */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditEntry(entry);
                      }}
                      className="p-1 px-2 border border-slate-100 hover:border-slate-200 text-slate-400 hover:text-primary hover:bg-slate-50 rounded-lg text-xs cursor-pointer transition-colors"
                      title="快速编辑编辑此记录"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteClick(entry.id, e)}
                      className="p-1 px-2 border border-slate-100 hover:border-rose-100 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-xs cursor-pointer transition-colors"
                      title="从认知库删除本条"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Block dialog overlays */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-gray-100 text-center"
          >
            <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-gray-900 mb-1">确定要抹除这条认知吗？</h4>
            <p className="text-xs text-gray-500 px-3 leading-relaxed mb-4">
              删除将永久抹除在库中的观点和反思，AI 的‘思维镜像观察’结果也将在刷新后发生变化。
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-medium cursor-pointer"
              >
                保留观点
              </button>
              <button
                onClick={() => handleConfirmDelete(showDeleteConfirm)}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                确定抹除
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Inspect Detail slideover panel/dialog modal */}
      <AnimatePresence>
        {inspectEntry && (
          <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center p-0 md:p-4 z-40">
            {/* Backdrop close wrapper */}
            <div className="absolute inset-0 cursor-pointer" onClick={() => setInspectEntry(null)} />
            
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-lg p-6 shadow-2xl relative border-t border-gray-100 z-10 max-h-[90vh] overflow-y-auto"
            >
              {/* Header inside details */}
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-50">
                <span className="text-[11px] font-sans font-medium text-slate-400 tracking-wide flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-300" />
                  认知建档于：{new Date(inspectEntry.createdAt).toLocaleString('zh-CN')}
                </span>
                <button
                  onClick={() => setInspectEntry(null)}
                  className="text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 p-1.5 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Detail body */}
              <div className="space-y-4">
                {/* Section A: Original point */}
                <div>
                  <span className="text-xs font-bold text-primary uppercase tracking-wider block mb-2 font-sans flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" />
                    学到的核心观点：
                  </span>
                  <div className="p-4 bg-gray-50/60 rounded-xl font-serif text-[15px] leading-relaxed text-gray-800 border border-gray-100">
                    “ {inspectEntry.content} ”
                  </div>
                </div>

                {/* Section B: Personal insightful reflections */}
                <div>
                  <span className="text-xs font-bold text-amber-500 uppercase tracking-wider block mb-2 font-sans flex items-center gap-1">
                    <Lightbulb className="w-3.5 h-3.5" />
                    思维启发（触动点）：
                  </span>
                  <div className="p-4 bg-amber-50/15 border border-amber-100/40 rounded-xl text-[14px] leading-relaxed text-gray-700">
                    {inspectEntry.insight}
                  </div>
                </div>

                {/* Tags and Source Row */}
                <div className="grid grid-cols-3 gap-2.5 pt-2 font-sans text-xs">
                  <div className="p-3 bg-slate-50 border border-slate-100/40 rounded-xl">
                    <span className="text-slate-400 block mb-1">引出观点来源：</span>
                    <span className="font-semibold text-slate-800 break-words">{inspectEntry.source || '深度自省自悟'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-100/40 rounded-xl">
                    <span className="text-slate-400 block mb-1">关联情绪特征：</span>
                    <span className="font-semibold text-slate-800">{inspectEntry.emotion || '平静 😌'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-100/40 rounded-xl col-span-3 md:col-span-1">
                    <span className="text-slate-400 block mb-1">标签分类：</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(inspectEntry.tags || []).length > 0 ? (
                        inspectEntry.tags.map(t => (
                          <span key={t} className="text-[9px] bg-white border border-[#EBE3D9] px-1.5 py-0.5 rounded text-[#5A5A40] font-sans font-medium">
                            #{t}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400">未分类</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom operational handles */}
              <div className="flex gap-2.5 pt-5 pb-1 border-t border-gray-100 mt-5">
                <button
                  onClick={(e) => {
                    handleDeleteClick(inspectEntry!.id, e);
                  }}
                  className="flex items-center justify-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 px-4 py-2.5 rounded-xl text-xs font-medium cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  删除本记
                </button>
                <button
                  onClick={() => {
                    onEditEntry(inspectEntry!);
                    setInspectEntry(null);
                  }}
                  className="flex-1 flex items-center justify-center gap-1 bg-primary hover:bg-primary-hover transition-all text-white py-2.5 rounded-xl text-xs font-semibold cursor-pointer shadow-xs active:scale-98"
                >
                  <Edit className="w-4 h-4" />
                  修改并完善内容及触动物语
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
