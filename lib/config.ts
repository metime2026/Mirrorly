/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Entry } from '../src/types';

export const USER_ID = process.env.MIRRORLY_USER_ID || 'user_default';
export const SESSION_COOKIE = 'mirrorly_session';
export const SESSION_DAYS = 30;

export const seedEntries: Array<
  Omit<Entry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
> = [
  {
    content:
      '《第五项修炼》提到：‘要想系统性思考，我们必须学会看清整体。’ 不要只看到局部因果（事件），而要看到长期的周期和结构模式。解决局部往往会引发系统其他地方的连锁反弹。',
    insight:
      '产品开发中经常有‘拆东墙补西墙’的问题。比如为了解决眼前的报错，堆叠大量零散逻辑而破坏了底层的统一状态模型。我们在写代码前应该多花10分钟推演状态流向图。',
    source: '书籍·彼得·圣吉《第五项修炼》',
    tags: ['系统思考', '产品设计', '架构思维'],
    emotion: '好奇',
  },
  {
    content:
      '著名的卡片盒笔记法（Zettelkasten）核心在于：每一张卡片应当只记录一个原子的想法（Atomicity），并且通过语义相连编织成蛛网状。分类和层级是静止的，唯有网状的双向链接是流动的知识生态系统。',
    insight:
      '我以前做笔记全在堆长文本，结果‘记完就废’。原子的认知记录容易提取，而且当把多个卡片拼插组合时，会碰撞出意想不到的主题火花。Mirrorly正是这种原子反思的物理实现。',
    source: '书籍·申克·阿伦斯《卡片盒笔记法》',
    tags: ['卡片盒', '认知升级', '高效工具'],
    emotion: '兴奋',
  },
  {
    content:
      '在开发软件时，早期的抽象是万恶之源。过早、过度的模块化架构会锁死设计的灵活性，使系统由于承载了未来不确定功能而负重前行。‘先让它跑起来，再让它完美’（Make it work, make it right, make it fast）。',
    insight:
      '回想上个项目重构时的绝望——为了并不存在的‘高并发’做了全套多集群微服务划分，结果在需求变更时改一行代码要通知4个人。极简、敏捷的单体和直观布局才是MVP的王道。',
    source: '播客·不合时宜《关于过度抽象的反思》',
    tags: ['极简主义', '架构思维', 'MVP法则'],
    emotion: '平静',
  },
  {
    content:
      '领导力的核心是‘建立心理安全感（Psychological Safety）’。当团队成员能够坦诚说出‘我不会’、‘我搞砸了’或者提出不同的异见而不必担心被排挤或看低时，这个团队的纠错和协作效率才最高。',
    insight:
      '今天晨会上小王勇敢指出了设计原型的体验逻辑缺陷。这在以往官僚氛围高昂的团队会被评为‘反骨’。我要在晨会制度里增加一个‘每周吐槽奖’，给打破虚伪和谐的成员发一颗彩虹糖。',
    source: '文章·Amy Edmondson《无畏的组织》',
    tags: ['团队合作', '领导力', '心理安全感'],
    emotion: '好奇',
  },
  {
    content:
      '时间箱（Time Boxing）绝对是克服完美主义和拖延症的最佳手段。将任务划分成坚实的30分钟区块，规定在此区块内只专注于写出初稿，不纠结标点、修辞或完美逻辑。时间到即强制进入下一阶段。',
    insight:
      '以往写文档总纠结头两个字，耗费数小时。最近使用30分钟时间箱写方案，虽然第一版很粗糙，但大脑有完整的成型。先写出50分草稿的人更容易写出100分好作品。',
    source: '文章·极客时间《现代知识管理实践》',
    tags: ['时间管理', '成长习惯', '高效工具'],
    emotion: '平静',
  },
];

export function getStageForEntryCount(count: number): string {
  if (count < 3) return '探索期';
  if (count < 8) return '聚焦期';
  if (count < 15) return '连接期';
  return '重构期';
}

export function isProduction(): boolean {
  return process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
}
