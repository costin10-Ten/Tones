/**
 * 故事分類標籤 — 單一來源
 * 修改這裡即可同步更新後台選項與前台篩選。
 * 改名時：先改這裡 → 再用編輯器全域搜尋舊名稱替換 .md 裡的 tags 欄位。
 */
export const STORY_TAGS = [
  'AI社會',
  '地下城市',
  '情感科技',
  '生態復育',
  '記憶科技',
  '危險',
  '極密',
  '🔍 彩蛋',
] as const;

export type StoryTag = (typeof STORY_TAGS)[number];
