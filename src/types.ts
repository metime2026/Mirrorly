/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Entry {
  id: string;
  userId: string;
  content: string; // 观点内容
  insight: string; // 触动点
  source?: string; // 来源 (可选)
  tags: string[]; // 标签数组
  emotion?: string; // 关联情绪 (可选)
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  userId: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

export interface Observation {
  userId: string;
  text: string;
  stage?: string;
  observationPart?: string;
  evidencePart?: string;
  questionPart?: string;
  generatedAt: string;
  expiredAt: string;
  entriesCount: number;
}
