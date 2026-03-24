/**
 * clueAnalyzer.ts
 * 使用 Claude API 分析故事文本，自動建議線索。
 * 供 CMS 後台或 CLI 腳本使用，結果需作者審核後才存入 frontmatter。
 */

import Anthropic from '@anthropic-ai/sdk';
import type { Clue } from '../content/config';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ClueSuggestion extends Omit<Clue, 'linkedClues' | 'confirmsHypothesis'> {
  linkedClues: string[];
  confirmsHypothesis: string[];
  reasoning: string; // 給作者看的分析說明（不儲存進 frontmatter）
}

export interface AnalysisResult {
  fileNum: string;
  title: string;
  suggestions: ClueSuggestion[];
  summary: string; // 整體分析摘要
}

// 貝氏權重說明（供 prompt 參考）
const WEIGHT_GUIDANCE = `
線索重要性權重：
- weight 1（次要細節）：背景細節，可能是紅鯡魚或次要補充
- weight 2（重要線索）：直接指向謎題核心，需要 1-2 條其他線索交叉驗證
- weight 3（關鍵證據）：最強力的單一證據，本身就能大幅推動假設確認度

貝氏更新乘數（設計參考）：
- TYPE-D 文件線索 × 1.5（權威性最高）
- TYPE-A 物證線索 × 1.2（具體可核實）
- TYPE-C 數位線索 × 1.0（精確但需解讀）
- TYPE-B 證詞線索 × 0.8（主觀性折扣）
`;

const ANALYSIS_PROMPT = `你是一位專業的推理遊戲設計師兼文學分析師，正在為一個近未來驚悚短篇故事集設計線索系統。

你的任務是分析故事內文，建議 2-4 條玩家可發現的線索。

## 線索分類系統

TYPE-A（物證）：故事中的具體物品、數字、地點、實體跡象
TYPE-B（證詞）：角色引語、對話、主觀陳述、心理感受描述
TYPE-C（數位）：系統記錄、時間戳、檔案編號、技術規格、數據點
TYPE-D（文件）：官方文件、法規條文、報告、契約、制度規則

## 重要原則

1. 公平遊戲（Fair Play）：線索必須在故事本文中有明確根據，不能憑空推斷
2. 橫向資訊（Lateral Information）：好的線索在跨故事情境中能獲得新意義
3. 紅鯡魚比例：建議每 4-5 條線索中有 1 條是誤導性的（isRedHerring: true）
4. 多樣性：盡量覆蓋不同的 type，避免全部都是同一類型

${WEIGHT_GUIDANCE}

## 輸出格式

請以 JSON 格式回傳，格式如下：
{
  "summary": "一段描述本故事在整體世界觀中的謎題意義（50-100字）",
  "suggestions": [
    {
      "id": "FILExxx-A01",  // fileNum去掉FILE-前綴，如 FILE-003 → FILE003
      "type": "artifact" | "testimony" | "digital" | "documentary",
      "content": "玩家發現此線索時看到的敘述（30-60字，用第三人稱，帶存檔感）",
      "weight": 1 | 2 | 3,
      "isRedHerring": false,
      "linkedClues": [],  // 建議關聯的其他線索 ID（跨故事）
      "confirmsHypothesis": [],  // 建議支持的假設 ID（HYPO-001等，若無則留空）
      "reasoning": "作者備註：為什麼這是一條好線索，以及設計意圖"
    }
  ]
}

## 現有假設 ID（供 confirmsHypothesis 參考）
- HYPO-001：台北地下平行基礎設施
- HYPO-002：科技條款中的隱性數據採集
- HYPO-003：失蹤案與異常空間的關聯
- HYPO-004：機構記錄的選擇性抹除`;

export async function analyzeStoryForClues(
  fileNum: string,
  title: string,
  content: string,
): Promise<AnalysisResult> {
  const userMessage = `請分析以下故事，建議合適的線索：

**檔案編號：** ${fileNum}
**故事標題：** ${title}

**故事內容：**
${content}`;

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    thinking: { type: 'adaptive' },
    system: ANALYSIS_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  // 取得文字回應
  let rawText = '';
  for (const block of response.content) {
    if (block.type === 'text') {
      rawText = block.text;
      break;
    }
  }

  // 解析 JSON
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Claude 回傳的格式無法解析：${rawText.slice(0, 200)}`);
  }

  const parsed = JSON.parse(jsonMatch[0]) as {
    summary: string;
    suggestions: ClueSuggestion[];
  };

  return {
    fileNum,
    title,
    summary: parsed.summary,
    suggestions: parsed.suggestions,
  };
}

/**
 * 批次分析多篇故事（供 CLI 使用）
 */
export async function batchAnalyzeStories(
  stories: Array<{ fileNum: string; title: string; content: string }>,
  delayMs = 2000,
): Promise<AnalysisResult[]> {
  const results: AnalysisResult[] = [];

  for (const story of stories) {
    console.log(`分析中：${story.fileNum} — ${story.title}`);
    const result = await analyzeStoryForClues(story.fileNum, story.title, story.content);
    results.push(result);

    // 避免 API rate limit
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}
