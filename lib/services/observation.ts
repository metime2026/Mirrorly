/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ObservationSegments {
  observationPart: string;
  evidencePart: string;
  questionPart: string;
}

export function parseObservationSegments(text: string): ObservationSegments {
  let observationPart = '';
  let evidencePart = '';
  let questionPart = '';

  const obsIndex = text.indexOf('### 观察');
  const eviIndex = text.indexOf('### 依据');
  const qIndex = text.indexOf('### 提问');

  if (obsIndex !== -1 && eviIndex !== -1 && qIndex !== -1) {
    observationPart = text.slice(obsIndex + 6, eviIndex).trim();
    evidencePart = text.slice(eviIndex + 6, qIndex).trim();
    questionPart = text.slice(qIndex + 6).trim();
  } else {
    const paragraphs = text.split('\n').filter((p) => p.trim());
    if (paragraphs.length >= 3) {
      observationPart = paragraphs[0];
      evidencePart = paragraphs[1];
      questionPart = paragraphs.slice(2).join('\n');
    } else {
      observationPart = text;
      evidencePart = '基于您近期记下的多个深层观点及打标分类。';
      questionPart =
        '在你刚刚写下的那些感叹和摘抄背后，反映了你现阶段怎样的核心痛点或发展方向？';
    }
  }

  observationPart = observationPart
    .replace(/^(观察[:：\s]*)/, '')
    .replace(/^([:：\s]*)/, '')
    .trim();
  evidencePart = evidencePart
    .replace(/^(依据[:：\s]*)/, '')
    .replace(/^([:：\s]*)/, '')
    .trim();
  questionPart = questionPart
    .replace(/^(提问[:：\s]*)/, '')
    .replace(/^([:：\s]*)/, '')
    .trim();

  return { observationPart, evidencePart, questionPart };
}
