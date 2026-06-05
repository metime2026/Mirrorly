/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from '@google/genai';

let aiInstance: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY is not configured.');
    }
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: { headers: { 'User-Agent': 'mirrorly-vercel' } },
    });
  }
  return aiInstance;
}

export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}
