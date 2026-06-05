/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Send, Copy, RefreshCw, Trash2, HelpCircle, 
  ArrowLeft, BrainCircuit, AlertTriangle, Check, BookOpen 
} from 'lucide-react';
import { Entry, Message } from '../types';
import { apiFetch } from '../lib/api';

interface AskAIViewProps {
  entries: Entry[];
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onOpenAddModal: () => void;
  embedMode?: boolean;
  onBack?: () => void;
}

export default function AskAIView({ entries, onToast, onOpenAddModal, embedMode = false, onBack }: AskAIViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const entriesCount = entries.length;

  // 1. Load chat logs on mount
  useEffect(() => {
    fetchChatLogs();
  }, [entriesCount]);

  // Load existing session chat logs from server
  const fetchChatLogs = async () => {
    try {
      const res = await apiFetch('/api/chat');
      const data = await res.json();
      if (Array.isArray(data)) {
        setMessages(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Scroll to bottom helper
  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleCopyText = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(index);
    onToast('✓ 启发提问已复制到剪贴板', 'success');
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const handleClearSession = async () => {
    if (messages.length === 0) return;
    try {
      setIsResetting(true);
      await apiFetch('/api/chat/reset', { method: 'POST' });
      setMessages([]);
      onToast('✓ 对话记录已清空', 'success');
    } catch (err) {
      onToast('重置失败', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const txt = userInput.trim();
    if (!txt || loading || txt.length > 500) return;

    const userMsg: Message = {
      role: 'user',
      content: txt,
      timestamp: new Date().toISOString()
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setUserInput('');
    setLoading(true);

    // Call server-side Ask AI API with entire messages history
    try {
      const res = await apiFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages })
      });
      
      const data = await res.json();

      if (res.ok && data.role === 'model') {
        setMessages(prev => [...prev, {
          role: 'model',
          content: data.content,
          timestamp: data.timestamp
        }]);
      } else {
        // Render detailed feedback
        onToast(data.message || '对话超时，系统抛出故障。', 'error');
        // Rollback user input to let him retry
        setUserInput(txt);
        setMessages(messages); // reset
      }
    } catch (err) {
      console.error(err);
      onToast('通信线路受阻。请检查您的网络连接并重提。', 'error');
      setUserInput(txt);
      setMessages(messages);
    } finally {
      setLoading(false);
    }
  };

  // Quick prompt templates to help spark user engagement
  const suggestions = [
    "我最近在产品定位和功能规划上很纠结...",
    "我总是难以保持专注和执行力...",
    "团队中有人经常推诿责任，该如何梳理？",
    "面对巨量输入学习，不知怎样将其转变为产出..."
  ];

  const handleApplySuggestion = (sug: string) => {
    setUserInput(sug);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Simple clean markdown-like inline bolding parser helper
  // Converts double asterisks **text** into bold html JSX layout
  const parseResponseLayout = (text: string) => {
    if (!text) return '';
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-extrabold text-slate-900 border-b border-primary/20 pb-0.5">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const isExceeded = userInput.length > 500;

  return (
    <div className={`w-full bg-white border border-[#EBE3D9] rounded-2xl shadow-3xs overflow-hidden flex flex-col ${embedMode ? 'h-[500px]' : 'h-[70vh]'}`}>
      {/* Dialogue Header */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-2">
          {onBack && (
            <button 
              onClick={onBack}
              className="p-1 hover:bg-gray-100 rounded-lg mr-1 cursor-pointer transition-colors"
              title="返回我的成长镜像"
            >
              <ArrowLeft className="w-5 h-5 text-[#5A5A40]" />
            </button>
          )}
          <div className="w-8 h-8 rounded-lg bg-[#F7F3ED] text-[#5A5A40] flex items-center justify-center font-bold">
            💡
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-900 font-sans">Ask AI 启发反思</h3>
            <span className="text-[9.5px] text-[#5A5A40] font-medium font-sans flex items-center gap-0.5">
              ● 依托您的 {entriesCount} 条学识资料库建立反射
            </span>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            onClick={handleClearSession}
            disabled={isResetting}
            className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
            title="清空当前对话会话"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages Scrolling Arena */}
      <div 
        ref={containerRef}
        className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50/20"
      >
        {messages.length === 0 ? (
          /* Greetings empty view */
          <div className="space-y-5 py-6">
            <div className="p-4 bg-[#F7F3ED]/40 rounded-xl border border-[#EBE3D9] text-center">
              <span className="text-xl inline-block mb-1.5">🔮</span>
              <h4 className="text-xs font-bold text-gray-800">思维反思反射中心</h4>
              <p className="text-[11px] text-gray-500 leading-relaxed max-w-sm mx-auto mt-1">
                请输入目前困扰您的现实选择或难题。我将不予指令建议，而通过引证您记忆库中的书本语录，向您连续质问，助您探微深奥底层。
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-[10.5px] text-gray-400 font-medium leading-none block px-1">您可以试着输入讨论：</span>
              <div className="space-y-1.5 font-sans">
                {suggestions.map(s => (
                  <button
                    key={s}
                    onClick={() => handleApplySuggestion(s)}
                    className="w-full text-left p-2.5 rounded-xl border border-gray-150 hover:bg-slate-50 transition-colors text-xs text-gray-600 flex items-center justify-between cursor-pointer group"
                  >
                    <span>{s}</span>
                    <HelpCircle className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Multi turn dialogue bubbles list */
          <div className="space-y-4">
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              
              return (
                <div 
                  key={index}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] rounded-2xl p-3.5 shadow-3xs relative group ${
                    isUser 
                      ? 'bg-primary text-white rounded-br-xs font-sans text-[13.5px]' 
                      : 'bg-[#F7F3ED] border border-[#EBE3D9] text-slate-800 rounded-bl-xs text-[13px] leading-relaxed serif'
                  }`}>
                    {/* Render message body content */}
                    <div className="whitespace-pre-wrap">
                      {isUser ? msg.content : parseResponseLayout(msg.content)}
                    </div>

                    {/* Copy option icon for AI responses */}
                    {!isUser && (
                      <div className="absolute -bottom-3 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-gray-200 rounded-lg p-1 flex shadow-xs z-10">
                        <button
                          onClick={() => handleCopyText(msg.content, index)}
                          className="text-gray-400 hover:text-gray-600 p-0.5"
                          title="复制提问"
                        >
                          {copiedId === index ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Typing visual loading indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-[#F7F3ED] border border-[#EBE3D9] rounded-2xl rounded-bl-xs p-4 flex items-center justify-center gap-1 shadow-3xs max-w-xs">
                  <span className="text-xs text-primary font-semibold pr-1">AI 正在反思匹配...</span>
                  <div className="flex gap-1">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input container bar */}
      <form 
        onSubmit={handleSend}
        className="p-3 border-t border-gray-100 flex-shrink-0 bg-white"
      >
        <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all">
          <textarea
            ref={textareaRef}
            rows={1}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="写下你当前的苦恼与疑问..."
            className="flex-1 max-h-[80px] min-h-[22px] py-0.5 bg-transparent border-none text-sm text-gray-800 placeholder-gray-400 focus:outline-none resize-none font-sans"
          />

          <div className="flex items-center gap-2 flex-shrink-0">
            {isExceeded && (
              <span className="text-[10px] text-rose-500 font-bold font-mono">
                {userInput.length}/500字
              </span>
            )}
            <button
              type="submit"
              disabled={loading || !userInput.trim() || isExceeded}
              className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                userInput.trim() && !loading && !isExceeded
                  ? 'bg-primary hover:bg-primary-hover text-white shadow-xs active:scale-95'
                  : 'bg-gray-100 text-gray-300 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
