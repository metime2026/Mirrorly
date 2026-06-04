/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, Database, Info, HelpCircle, ArrowRight, 
  Sparkles, Calendar, BookOpen, Clock, AlertCircle, PlusCircle, CheckCircle
} from 'lucide-react';
import { Entry } from '../types';

interface DashboardViewProps {
  entries: Entry[];
  onNavigateToLibrary: (initialTag?: string) => void;
  onNavigateToChat: () => void;
  onOpenAddModal: () => void;
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onNotifyDataChanged: () => void;
}

interface ObservationResponse {
  type: 'cold' | 'calc' | 'error';
  entriesCount: number;
  stage: '探索期' | '聚焦期' | '连接期' | '重构期';
  text: string;
  observationPart?: string;
  evidencePart?: string;
  questionPart?: string;
  cached?: boolean;
}

const PRESET_TOPICS = [
  { name: '系统思维', defaultX: 200, defaultY: 120, color: '#5A5A40' },
  { name: '成长', defaultX: 100, defaultY: 65, color: '#A08A8C' },
  { name: '产品思维', defaultX: 300, defaultY: 70, color: '#798C84' },
  { name: '决策思考', defaultX: 85, defaultY: 175, color: '#A68A64' },
  { name: '团队管理', defaultX: 315, defaultY: 170, color: '#D4A373' },
  { name: '效率方法', defaultX: 200, defaultY: 205, color: '#709CB0' }
];

export default function DashboardView({ 
  entries, 
  onNavigateToLibrary, 
  onNavigateToChat, 
  onOpenAddModal,
  onToast,
  onNotifyDataChanged
}: DashboardViewProps) {
  const [observation, setObservation] = useState<ObservationResponse | null>(null);
  const [loadingObs, setLoadingObs] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDemoWorking, setIsDemoWorking] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [selectedBubbleId, setSelectedBubbleId] = useState<string>('');

  // Fetch AI Observation
  const fetchObservation = async (forceRefresh = false) => {
    try {
      if (forceRefresh) setIsRefreshing(true);
      else setLoadingObs(true);

      const res = await fetch('/api/observation');
      const data = await res.json();
      setObservation(data);
    } catch (err) {
      console.error(err);
      setObservation({
        type: 'error',
        entriesCount: entries.length,
        stage: '探索期',
        text: '📡 无法连接服务器加载 AI 镜像观察。请重试。'
      });
    } finally {
      setLoadingObs(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchObservation();
  }, [entries.length]);

  // Dynamic tags distribution extraction
  const getTagsDistribution = () => {
    const map: Record<string, { count: number; lastCreated: string; list: Entry[] }> = {};
    entries.forEach(e => {
      (e.tags || []).forEach(t => {
        if (!t) return;
        if (!map[t]) {
          map[t] = { count: 0, lastCreated: '', list: [] };
        }
        map[t].count += 1;
        if (!map[t].lastCreated || new Date(e.createdAt) > new Date(map[t].lastCreated)) {
          map[t].lastCreated = e.createdAt;
        }
        map[t].list.push(e);
      });
    });
    return Object.entries(map).sort((a, b) => b[1].count - a[1].count);
  };

  const tagStats = getTagsDistribution();
  const topActiveTheme = tagStats.length > 0 ? tagStats[0][0] : '系统思维';
  
  // Calculate stats comparing to "last week"
  const recentAddedCount = entries.filter(e => {
    const diffTime = Math.abs(Date.now() - new Date(e.createdAt).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  }).length;

  // Map user tags dynamically onto bubbles preset coordinates
  const bubbles = PRESET_TOPICS.map((preset, idx) => {
    const isCenter = idx === 0;
    const realTagData = tagStats[idx];

    if (realTagData) {
      const [tagName, info] = realTagData;
      return {
        id: `bubble_${tagName}`,
        name: tagName,
        count: info.count,
        lastCreated: info.lastCreated,
        list: info.list,
        isReal: true,
        x: preset.defaultX,
        y: preset.defaultY,
        color: preset.color,
        isCenter
      };
    } else {
      return {
        id: `placeholder_${preset.name}`,
        name: preset.name,
        count: 0,
        lastCreated: '',
        list: [],
        isReal: false,
        x: preset.defaultX,
        y: preset.defaultY,
        color: preset.color + '44', // 25% opacity
        isCenter
      };
    }
  });

  // Automatically select the center/first bubble on load
  const activeSelectedBubble = bubbles.find(b => b.id === selectedBubbleId) || bubbles[0];

  // Progression milestones helper
  const getProgressionMilestone = () => {
    const count = entries.length;
    if (count === 0) {
      return {
        level: '0条记录',
        status: '体系未萌发',
        description: '开始积累你的认知吧。记录第一条观点，你的认知镜像将逐渐形成。'
      };
    } else if (count <= 5) {
      return {
        level: '1-5条记录',
        status: '认知正在萌芽',
        description: '你的学识触觉正在缓慢生长。随便记录启发，AI 就会找出微弱的共鸣关联。'
      };
    } else if (count <= 20) {
      return {
        level: '6-20条记录',
        status: '认知开始聚焦',
        description: '你已经在多个主题上深入思考。思维网盘逐渐有了主线，正在向中心吸引。'
      };
    } else if (count <= 50) {
      return {
        level: '21-50条记录',
        status: '认知网络形成',
        description: '思想概念之间开始产生大量的互引。你会惊喜地发现，相似的问题正被不同的方法回击。'
      };
    } else {
      return {
        level: '50+条记录',
        status: '心智体系趋于成熟',
        description: '极高密度的思想奇点。你掌握了自我迭代的复利密码，拥有一幅属于自己的思维沙盒地图。'
      };
    }
  };

  const milestone = getProgressionMilestone();

  // Helper formatting dates beautifully
  const formatTimeAgo = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return '刚刚';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}小时前`;
    const days = Math.floor(hours / 24);
    if (days === 1) return '昨天';
    return `${days}天前`;
  };

  // Seed samples helper
  const handleImportSampleData = async () => {
    try {
      setIsDemoWorking(true);
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        onToast('✓ 成功载入5条精选认知体系！', 'success');
        onNotifyDataChanged();
      } else {
        onToast('载入失败：' + (data.message || ''), 'error');
      }
    } catch (err) {
      onToast('导入演示数据异常', 'error');
    } finally {
      setIsDemoWorking(false);
    }
  };

  // Clear DB helper
  const handleClearDatabase = async () => {
    if (!window.confirm('您确定要清空数据库中所有的认知资料及对话记录吗？')) return;
    try {
      setIsDemoWorking(true);
      const res = await fetch('/api/clear', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        onToast('✓ 数据已重置清空。', 'success');
        onNotifyDataChanged();
        setSelectedBubbleId('');
      }
    } catch (err) {
      onToast('清理失败，服务器连接错误', 'error');
    } finally {
      setIsDemoWorking(false);
    }
  };

  return (
    <div className="space-y-5 pb-8 selection:bg-primary/20">
      
      {/* branding header */}
      <div className="flex justify-between items-center pb-2.5 border-b border-[#EBE3D9]">
        <div>
          <h1 className="text-2xl font-bold font-serif tracking-tight text-[#2B2B20]">Mirrorly</h1>
          <p className="text-xs text-[#8C8C73] font-sans mt-0.5 font-medium">你的认知镜像</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => fetchObservation(true)}
            disabled={isRefreshing || loadingObs}
            className="p-2 border border-[#EBE3D9] rounded-xl hover:bg-white text-[#5A5A40] hover:text-[#444430] transition-all cursor-pointer bg-[#F7F3ED]"
            title="刷新镜像观察"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#5A5A40]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Metric blocks similar to attachment */}
      <div className="grid grid-cols-2 gap-3.5">
        <div className="bg-white border border-[#EBE3D9] rounded-2xl p-4 shadow-3xs hover:shadow-2xs transition-all">
          <span className="text-[10px] text-[#8C8479] font-medium block">已记录</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-bold text-gray-900 font-serif">{entries.length}</span>
            <span className="text-xs text-gray-500">条</span>
          </div>
          <span className="text-[9.5px] text-emerald-600 block mt-1 font-semibold">
            {recentAddedCount > 0 ? `比上周 +${recentAddedCount}` : '等待新增手札'}
          </span>
        </div>

        <div className="bg-white border border-[#EBE3D9] rounded-2xl p-4 shadow-3xs hover:shadow-2xs transition-all">
          <span className="text-[10px] text-[#8C8479] font-medium block">最活跃主题</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-base font-bold text-gray-900 font-sans truncate max-w-[120px]" title={topActiveTheme}>
              {topActiveTheme}
            </span>
          </div>
          <span className="text-[9.5px] text-[#8C8479] block mt-1 font-medium">最近 7 天活跃</span>
        </div>
      </div>

      {/* Interactive Constellation Bubble Map Panel ("我在思考什么") */}
      <div className="bg-white rounded-2xl border border-[#EBE3D9] shadow-3xs overflow-hidden relative">
        <div className="px-4 py-3.5 border-b border-[#EBE3D9] bg-[#F7F3ED]/40 flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">🎈</span>
            <h3 className="text-xs font-bold text-gray-900 font-sans">我在思考什么</h3>
            <button 
              onClick={() => setShowExplanation(!showExplanation)}
              className="text-[#8C8479] hover:text-[#5A5A40] transition-colors p-0.5 cursor-pointer"
              title="查看视觉图谱释义"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>
          <span className="text-[9.5px] font-semibold text-[#5A5A40] bg-[#F2EDE4] px-2 py-0.5 rounded-full border border-[#EBE3D9]">
            认知气泡图谱
          </span>
        </div>

        {showExplanation && (
          <div className="p-4 bg-[#F7F3ED]/60 border-b border-[#EBE3D9] text-[11px] text-gray-600 space-y-1.5 leading-relaxed animate-fade-in">
            <p className="font-bold text-gray-800">🔮 认知星图盘规则：</p>
            <p>• <strong className="text-gray-900">大小</strong>：你的此主题词记录数越多，气泡在星盘上就膨胀得越大。</p>
            <p>• <strong className="text-gray-900">颜色</strong>：根据不同认知的色系预设分栏色块，渲染出独一无二的心智气相。</p>
            <p>• <strong className="text-gray-900">距离</strong>：核心或相关性越强的标签将自动被万有引力拉拽至星系中心。</p>
            <p>• <strong className="text-gray-900">光晕</strong>：外围的轻微轨道引力线，暗示您认知子主题之间的交叉反思关联。</p>
          </div>
        )}

        <div className="p-2 bg-[#FDFCFB] flex justify-center items-center relative select-none">
          {/* Constellation SVG Sandbox */}
          <svg viewBox="0 0 400 240" className="w-full h-auto max-w-sm overflow-visible">
            {/* Ambient Background Circles representing Gravity Orbit lines */}
            <circle cx="200" cy="120" r="70" stroke="#F0EAE1" strokeWidth="1" strokeDasharray="3 3" fill="none" className="animate-spin-slow" />
            <circle cx="200" cy="120" r="110" stroke="#EDE6DC" strokeWidth="0.8" strokeDasharray="4 4" fill="none" opacity="0.8" />
            <circle cx="200" cy="120" r="140" stroke="#EAE0D3" strokeWidth="0.6" strokeDasharray="5 5" fill="none" opacity="0.5" />

            {/* Draw connector strands between satellites and center */}
            {bubbles.map((b, i) => {
              if (b.isCenter) return null;
              const isSelected = activeSelectedBubble.id === b.id;
              return (
                <line 
                  key={`link_${b.id}`}
                  x1="200" 
                  y1="120" 
                  x2={b.x} 
                  y2={b.y} 
                  stroke={isSelected ? '#5A5A40' : '#EBE3D9'} 
                  strokeWidth={isSelected ? '1.5' : '1'} 
                  strokeDasharray={b.isReal ? (isSelected ? 'none' : '3 3') : '5 5'}
                  opacity={b.isReal ? (isSelected ? '1' : '0.6') : '0.3'}
                  className="transition-all duration-300"
                />
              );
            })}

            {/* Bubble rendering loops */}
            {bubbles.map((b, i) => {
              const isSelected = activeSelectedBubble.id === b.id;
              // Size computed by count
              const baseRadius = b.isCenter ? 40 : 25;
              const r = Math.min(b.isCenter ? 50 : 35, baseRadius + (b.count * 1.5));
              
              return (
                <g 
                  key={b.id} 
                  className="cursor-pointer group"
                  onClick={() => setSelectedBubbleId(b.id)}
                >
                  {/* Outer active halo */}
                  <circle 
                    cx={b.x} 
                    cy={b.y} 
                    r={r + 6} 
                    fill="none" 
                    stroke={b.isReal ? b.color : 'transparent'} 
                    strokeWidth="1"
                    strokeDasharray="2 2"
                    opacity={isSelected ? '0.8' : '0'} 
                    className="transition-all duration-300 animate-pulse"
                  />
                  
                  {/* Main Bubble */}
                  <circle 
                    cx={b.x} 
                    cy={b.y} 
                    r={r} 
                    fill={b.isReal ? b.color : '#F5F5F0'} 
                    stroke={b.isReal ? (isSelected ? '#FFFFFF' : 'transparent') : b.color}
                    strokeWidth={isSelected ? '2.5' : '1.5'}
                    strokeDasharray={b.isReal ? 'none' : '4 3'}
                    opacity={b.isReal ? '0.9' : '0.45'}
                    className="transition-all duration-300 shadow-sm filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)] group-hover:scale-105 transform origin-center"
                  />
                  
                  {/* Title Label in center of bubble */}
                  <text 
                    x={b.x} 
                    y={b.y + 4} 
                    textAnchor="middle" 
                    fill={b.isReal ? '#FFFFFF' : '#8C8479'} 
                    fontSize={b.isCenter ? '11px' : '9.5px'}
                    fontWeight="bold"
                    className="font-sans pointer-events-none"
                  >
                    {b.name}
                  </text>

                  {/* Indicator count badge inside bubble */}
                  {b.isReal && b.count > 0 && (
                    <text 
                      x={b.x} 
                      y={b.y + 13} 
                      textAnchor="middle" 
                      fill="rgba(255,255,255,0.7)" 
                      fontSize="7px"
                      className="font-sans pointer-events-none"
                    >
                      {b.count}条
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Constellation Legends */}
        <div className="px-4 py-2 border-t border-gray-100 bg-[#FDFCFB] flex justify-center items-center gap-4 text-[9.5px] text-[#8C8479] font-medium flex-wrap">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#5A5A40]"></span>核心主题
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#A08A8C]"></span>高频主题
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#798C84]"></span>关注主题
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full border border-dashed border-[#D4A373] bg-[#D4A373]/20"></span>新出现/引导气泡
          </span>
        </div>

        {/* Selected Bubble Live Card Drawer */}
        <div className="p-4 bg-[#F7F3ED]/35 border-t border-[#EBE3D9] space-y-2.5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-[#EBE3D9] text-[#5A5A40] font-bold">
                {activeSelectedBubble.isCenter ? '🌌 核心锚定' : '🪐 卫星维度'}
              </span>
              <h4 className="text-xs font-bold text-gray-900 font-sans">{activeSelectedBubble.name}</h4>
              <span className="text-[10px] text-gray-500 font-sans">
                {activeSelectedBubble.isReal ? `(共计 ${activeSelectedBubble.count} 篇记录)` : '(预设点亮提示)'}
              </span>
            </div>
            {activeSelectedBubble.isReal && (
              <button 
                onClick={() => onNavigateToLibrary(activeSelectedBubble.name)}
                className="text-[10px] font-bold text-[#5A5A40] hover:text-[#444430] flex items-center gap-0.5 transition-all cursor-pointer hover:underline"
              >
                进入检索馆
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {activeSelectedBubble.isReal ? (
            <div className="space-y-1.5 bg-white p-3 rounded-xl border border-gray-150/60 shadow-3xs">
              <div className="flex justify-between items-center text-[9px] text-[#8C8479]">
                <span className="flex items-center gap-0.5">
                  <Clock className="w-3 h-3" />
                  最近思考: {formatTimeAgo(activeSelectedBubble.lastCreated)}
                </span>
                <span>来自手札库</span>
              </div>
              <p className="text-xs text-gray-700 leading-normal italic font-serif line-clamp-2">
                "{(activeSelectedBubble.list?.[0]?.insight) || (activeSelectedBubble.list?.[0]?.content) || '未记下详细触动'}"
              </p>
            </div>
          ) : (
            <div className="bg-[#F7F3ED]/40 border border-dashed border-[#EBE3D9] p-3 rounded-xl flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold text-[#5A5A40]">💡 此概念气泡未完全唤醒</p>
                <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">
                  这是一个系统预设认知模组。撰写包含该标签的观点笔记，即可完全照亮它。
                </p>
              </div>
              <button
                onClick={onOpenAddModal}
                className="py-1 px-2.5 bg-[#5A5A40] hover:bg-[#444430] text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap active:scale-95 shadow-3xs"
              >
                点亮它
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sandbox Controller Widget */}
      <div className="p-3.5 bg-[#F7F3ED] border border-[#EBE3D9] rounded-2xl shadow-3xs">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10.5px] font-bold text-[#4A443F] font-sans flex items-center gap-1">
            <Database className="w-3.5 h-3.5 text-[#5A5A40]" />
            演示控制沙盒
          </span>
          <span className="text-[9.5px] text-[#8C8C73] font-sans font-semibold">已记录: {entries.length} 条</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleImportSampleData}
            disabled={isDemoWorking}
            className="flex-1 py-1.5 px-3 text-[10px] font-bold text-white bg-[#5A5A40] hover:bg-[#444430] rounded-xl cursor-pointer transition-all active:scale-95 disabled:opacity-50 shadow-3xs"
          >
            导入5条精选示范
          </button>
          <button
            onClick={handleClearDatabase}
            disabled={isDemoWorking}
            className="flex-1 py-1.5 px-3 text-[10px] font-medium text-[#4A443F] bg-white hover:bg-rose-50 hover:text-rose-600 border border-[#EBE3D9] hover:border-rose-200 rounded-xl cursor-pointer transition-all active:scale-95 shadow-3xs"
          >
            重置清空成长库
          </button>
        </div>
      </div>

      {/* AI 观察 (AI Observation Text Card) */}
      <div className="bg-white rounded-2xl border border-[#EBE3D9] overflow-hidden shadow-3xs">
        <div className="px-4 py-3 border-b border-[#EBE3D9] bg-[#F7F3ED]/40 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-base">🔮</span>
            <div>
              <h3 className="text-xs font-bold text-gray-900 font-sans">AI 观察 (Cognitive Mirror)</h3>
              <p className="text-[9.5px] text-[#8C8479]">基于您记录的思考碎片，提炼深层思维定式</p>
            </div>
          </div>
          {observation?.type === 'calc' && (
            <span className="text-[9px] text-[#5A5A40] bg-[#F2EDE4] px-1.5 py-0.5 rounded-full font-semibold border border-[#EBE3D9]">
              {observation.cached ? '已从缓存读取' : '即时生成'}
            </span>
          )}
        </div>
        
        <div className="p-4">
          {loadingObs ? (
            <div className="space-y-2 py-1">
              <div className="h-3.5 bg-gray-100 rounded w-4/5 animate-pulse" />
              <div className="h-3.5 bg-gray-100 rounded animate-pulse" />
              <div className="h-3.5 bg-gray-100 rounded w-2/3 animate-pulse" />
            </div>
          ) : observation?.type === 'cold' ? (
            <div className="space-y-3">
              <p className="text-xs text-[#8C8479] leading-relaxed">
                🌿 您的认知库目前仅包含 <strong>{entries.length}</strong> 条记录。建议先积累至少 <strong>5条</strong> 认知手札（或通过上方沙盒一键导入演示数据），以此唤醒 AI 智能的多维度思维特征透视，拒绝空泛总结。
              </p>
              <button
                onClick={onOpenAddModal}
                className="w-full py-2 bg-[#5A5A40] hover:bg-[#444430] text-white text-[11px] font-bold rounded-xl transition-all cursor-pointer text-center"
              >
                📝 撰写我的第一条启发手札
              </button>
            </div>
          ) : (
            <div className="space-y-3 font-sans">
              {observation?.observationPart ? (
                <>
                  <div className="p-3 bg-[#F7F3ED]/45 border border-[#EBE3D9]/60 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-[#5A5A40] block mb-0.5">### 核心观察</span>
                    <p className="text-xs text-gray-800 leading-relaxed font-sans font-medium whitespace-pre-wrap">
                      {observation.observationPart}
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50/10 border border-amber-200/40 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-amber-800 block mb-0.5">### 现实依据</span>
                    <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">
                      {observation.evidencePart}
                    </p>
                  </div>
                  <div className="p-3 bg-indigo-50/10 border border-indigo-200/40 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-indigo-800 block mb-0.5">### 面向破局的质问</span>
                    <p className="text-xs text-[#2D2A26] leading-relaxed italic font-serif whitespace-pre-wrap">
                      {observation.questionPart}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-xs text-gray-700 leading-relaxed italic whitespace-pre-wrap">
                  "{observation?.text}"
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 认知时间流 Section ("认知时间流") matching attached image bottom part */}
      <div className="bg-white rounded-2xl border border-[#EBE3D9] p-4 shadow-3xs space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">〰️</span>
            <h4 className="text-xs font-bold text-gray-900 font-sans">认知时间流</h4>
            <span className="text-[9.5px] text-[#8C8479] font-medium">(时间维度)</span>
          </div>
          <span className="text-[9px] font-semibold text-gray-500 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded-full">
            {milestone.status}
          </span>
        </div>

        <p className="text-[11px] text-gray-500 leading-relaxed">
          {milestone.description}
        </p>

        {/* Waves of dots represent chronogical entry mapping */}
        <div className="pt-2">
          <div className="h-10 bg-slate-50/40 rounded-xl relative border border-gray-100 flex items-center overflow-x-hidden overflow-y-visible">
            {/* The beautiful running dotted coordinate wave string */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
              <path 
                d="M 0 20 Q 80 8, 150 25 T 320 15 T 400 20" 
                stroke="#EBE3D9" 
                strokeWidth="1.5" 
                fill="none" 
              />
            </svg>

            {/* Float dots inside the wave coordinate streams */}
            {entries.length === 0 ? (
              <span className="text-[10px] text-gray-400 italic block mx-auto font-sans">等待注入第一滴认知水滴...</span>
            ) : (
              <div className="w-full h-full px-4 relative flex items-center">
                {entries.slice(-10).map((e, idx) => {
                  const percent = Math.min(92, 8 + (idx * 9));
                  // Compute sine wave Y coordinate to sit exactly on the path
                  const angle = (percent / 100) * Math.PI * 3.2;
                  const yOffset = Math.sin(angle) * 8 + 16;
                  const dotColor = (e.tags && e.tags.length > 0) ? '#5A5A40' : '#888888';
                  
                  return (
                    <div 
                      key={`stream_${e.id}`}
                      className="absolute group z-10 cursor-pointer h-5 w-5 flex items-center justify-center -translate-x-1/2"
                      style={{ left: `${percent}%`, top: `${yOffset}px` }}
                      title={`${e.tags?.[0] || '认知手札'}: ${e.content.slice(0, 20)}...`}
                    >
                      <div 
                        className="h-2 w-2 rounded-full transition-all group-hover:scale-135"
                        style={{ backgroundColor: dotColor, boxShadow: `0 0 4px ${dotColor}` }}
                      />
                      {/* Hover Popover Box */}
                      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gray-900 border border-gray-800 text-white text-[9.5px] py-1 px-2 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 shadow-lg transition-opacity z-20 font-sans">
                        {e.tags?.[0] ? `【${e.tags[0]}】` : ''} {e.content.slice(0, 12)}...
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          <div className="flex justify-between items-center text-[8.5px] text-[#8C8479] font-medium font-mono pt-1.5 px-1 pb-0.5">
            <span>4/10</span>
            <span>4/24</span>
            <span>5/8</span>
            <span>5/22</span>
            <span className="text-[#5A5A40] font-bold">今天</span>
          </div>
        </div>
      </div>

    </div>
  );
}
