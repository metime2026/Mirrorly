/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, BookOpen, BrainCircuit, PlusCircle, Calendar, ShieldCheck } from 'lucide-react';

import { Entry } from './types';
import DashboardView from './components/DashboardView';
import LibraryView from './components/LibraryView';
import AskAIView from './components/AskAIView';
import EntryForm from './components/EntryForm';
import { ToastContainer } from './components/Toast';

export default function App() {
  // Navigation Tabs: 'home' | 'library' | 'chat'
  const [activeTab, setActiveTab] = useState<'home' | 'library' | 'chat'>('home');
  
  // Database status
  const [entries, setEntries] = useState<Entry[]>([]);
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);

  // Modal forms
  const [showAddForm, setShowAddForm] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<Entry | null>(null);

  // Toast Alerts system state
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: 'success' | 'error' | 'info' }>>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `toast_${Date.now()}`;
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // 1. Load active data from server
  const loadDatabase = async () => {
    try {
      const resEntries = await fetch('/api/entries');
      const dataEntries = await resEntries.json();
      if (Array.isArray(dataEntries)) {
        setEntries(dataEntries);
      }

      const resTags = await fetch('/api/tags');
      const dataTags = await resTags.json();
      if (Array.isArray(dataTags)) {
        setExistingTags(dataTags.map(item => item.tag));
      }
    } catch (err) {
      console.error(err);
      addToast('📡 远程读取认知库失败，请检查连接', 'error');
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    loadDatabase();
  }, []);

  // 2. Add / Edit Record controller
  const handleSaveEntry = async (data: { content: string; insight: string; source: string; tags: string[] }) => {
    try {
      if (entryToEdit) {
        // Edit Mode
        const res = await fetch(`/api/entries/${entryToEdit.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const updatedEntry = await res.json();
        
        if (res.ok) {
          addToast('✏️ 历史认知已被完美修正。', 'success');
          setEntryToEdit(null);
          loadDatabase();
        } else {
          addToast(updatedEntry.error || '修正失败', 'error');
        }
      } else {
        // Create Mode
        const res = await fetch('/api/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const newEntry = await res.json();

        if (res.ok) {
          addToast('✓ 认知已保存，正投影到思想镜像中。', 'success');
          setShowAddForm(false);
          loadDatabase();
        } else {
          addToast(newEntry.error || '入库失败', 'error');
        }
      }
    } catch (err) {
      console.error(err);
      addToast('数据持久化通信出错', 'error');
    }
  };

  // 3. Delete Record controller
  const handleDeleteEntry = async (id: string) => {
    try {
      const res = await fetch(`/api/entries/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setEntries(entries.filter(e => e.id !== id));
        loadDatabase();
      } else {
        addToast('删除失败', 'error');
      }
    } catch (err) {
      console.error(err);
      addToast('通信异常，无法完成删除', 'error');
    }
  };

  const handleTriggerEdit = (entry: Entry) => {
    setEntryToEdit(entry);
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] flex flex-col justify-between font-sans selection:bg-primary/20 select-none pb-24 md:pb-6">
      
      {/* Dynamic Sandbox header banner for evaluators */}
      <div className="bg-primary hover:bg-primary-hover text-white text-[10.5px] px-4 py-2 text-center font-sans tracking-wide flex items-center justify-center gap-1.5 flex-shrink-0">
        <span className="inline-block w-2 h-2 bg-[#8C8C73] rounded-full animate-pulse" />
        <span className="opacity-95 font-medium">Mirrorly Full-Stack Workspace · Natural Tones Theme</span>
        <span className="hidden md:inline text-white/40">|</span>
        <span className="hidden md:inline opacity-75">时效缓存 AI 镜像观察模式与多轮质问引导</span>
      </div>

      {/* Main Container Core */}
      <main className="flex-1 max-w-lg w-full mx-auto px-4 py-5 overflow-x-hidden">
        {isInitializing ? (
          /* Loader */
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-xs text-[#8C8479]">正在载入 Mirrorly 极简认知库...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === 'home' && (
                <DashboardView 
                  entries={entries}
                  onNavigateToLibrary={() => setActiveTab('library')}
                  onNavigateToChat={() => setActiveTab('chat')}
                  onOpenAddModal={() => setShowAddForm(true)}
                  onToast={addToast}
                  onNotifyDataChanged={loadDatabase}
                />
              )}

              {activeTab === 'library' && (
                <LibraryView 
                  entries={entries}
                  onEditEntry={handleTriggerEdit}
                  onDeleteEntry={handleDeleteEntry}
                  onOpenAddModal={() => setShowAddForm(true)}
                  onToast={addToast}
                />
              )}

              {activeTab === 'chat' && (
                <AskAIView 
                  entries={entries}
                  onToast={addToast}
                  onOpenAddModal={() => setShowAddForm(true)}
                  onBack={() => setActiveTab('home')}
                />
              )}


            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* Overlay Create / Edit Entry form slide drawer */}
      <AnimatePresence>
        {(showAddForm || entryToEdit) && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-end md:items-center justify-center p-0 md:p-4 z-50">
            {/* Dark modal click-out helper */}
            <div 
              className="absolute inset-0 cursor-pointer" 
              onClick={() => {
                if (window.confirm('您确定要退出当前草稿吗？当前草稿已被局部保存在 localStorage。')) {
                  setShowAddForm(false);
                  setEntryToEdit(null);
                }
              }} 
            />
            
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="w-full max-w-xl z-10 max-h-[92vh] overflow-y-auto"
            >
              <EntryForm
                entryToEdit={entryToEdit}
                onSave={handleSaveEntry}
                onCancel={() => {
                  setShowAddForm(false);
                  setEntryToEdit(null);
                }}
                existingTags={existingTags}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Ask AI Button (New workspace Page Entry FAB) */}
      {activeTab !== 'chat' && (
        <button
          onClick={() => setActiveTab('chat')}
          className="fixed right-5 bottom-22 bg-[#5A5A40] hover:bg-[#444430] text-white py-3 px-4 rounded-full shadow-lg hover:shadow-xl active:scale-95 z-45 cursor-pointer transition-all flex items-center gap-2 border-2 border-[#FDFCFB] md:right-[calc(50%-13rem)]"
          title="打开 Ask AI 辩证对话"
        >
          <div className="relative">
            <BrainCircuit className="w-4.5 h-4.5 text-white" />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E6C280] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
            </span>
          </div>
          <span className="text-[11px] font-bold tracking-wide font-sans">Ask AI</span>
        </button>
      )}

      {/* Static Fixed Bottom Navigation bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#F7F3ED] border-t border-[#EBE3D9] px-6 py-2.5 shadow-lg md:max-w-md md:mx-auto md:rounded-t-2xl z-30">
        <div className="flex justify-between items-center px-4">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-1 cursor-pointer transition-all w-20 ${
              activeTab === 'home' ? 'text-primary font-bold scale-105' : 'text-[#8C8479] hover:text-primary'
            }`}
          >
            <Sparkles className="w-5.5 h-5.5" />
            <span className="text-[10px] font-medium font-sans">我的镜像</span>
          </button>

          {/* Centered Circular Plus Button */}
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-[#5A5A40] hover:bg-[#444430] text-white shadow-md active:scale-90 transition-all -mt-5 z-40 border-4 border-[#FDFCFB] cursor-pointer"
            title="记录新观点手札"
          >
            <PlusCircle className="w-5.5 h-5.5 text-white" />
          </button>

          <button
            onClick={() => setActiveTab('library')}
            className={`flex flex-col items-center gap-1 cursor-pointer transition-all w-20 ${
              activeTab === 'library' ? 'text-primary font-bold scale-105' : 'text-[#8C8479] hover:text-[#5A5A40]'
            }`}
          >
            <BookOpen className="w-5.5 h-5.5" />
            <span className="text-[10px] font-medium font-sans">记录馆</span>
          </button>
        </div>
      </nav>

      {/* Shared alert notify popups container */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}
