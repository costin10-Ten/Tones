import { config, fields, collection, singleton } from '@keystatic/core';
import { STORY_TAGS } from './src/content/tags';

export default config({
  storage: import.meta.env.PROD
    ? {
        kind: 'github',
        repo: {
          owner: 'costin10-Ten',
          name: 'Tones',
        },
        branchPrefix: 'content/',
      }
    : { kind: 'local' },

  ui: {
    brand: { name: '弦音異象 後台' },
  },

  collections: {
    stories: collection({
      label: '驚悚短篇',
      slugField: 'title',
      path: 'src/content/stories/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: '標題' } }),
        fileNum: fields.text({ label: '檔案編號' }),
        date: fields.text({ label: '案發日期' }),
        readTime: fields.text({ label: '預估閱讀時間' }),
        tags: fields.array(
          fields.text({ label: '標籤' }),
          {
            label: '分類標籤',
            description: `現有分類（點＋新增後直接貼上）：${STORY_TAGS.join('　／　')}`,
            itemLabel: (props) => props.value,
          }
        ),
        level: fields.select({
          label: '機密等級',
          options: [
            { label: '公開', value: 'public' },
            { label: '限制（需登入）', value: 'restricted' },
            { label: '極密（需登入）', value: 'top-secret' },
            { label: '付費', value: 'paid' },
          ],
          defaultValue: 'public',
        }),
        excerpt: fields.text({ label: '摘要', multiline: true }),
        author: fields.text({ label: '作者', defaultValue: '弦音觀測者' }),
        vis: fields.select({
          label: '視覺樣式',
          options: [
            { label: 'V1 — 紅色', value: 'v1' },
            { label: 'V2 — 暗黑', value: 'v2' },
            { label: 'V3 — 綠色', value: 'v3' },
            { label: 'V4 — 藍色', value: 'v4' },
            { label: 'V5 — 紫色', value: 'v5' },
          ],
          defaultValue: 'v1',
        }),
        icon: fields.select({
          label: '圖示符號',
          defaultValue: '✖',
          options: [
            // ── 禁止 / 危險 ──────────────────────────────
            { label: '✖  大叉號',        value: '✖' },
            { label: '✗  細叉號',        value: '✗' },
            { label: '✘  粗叉號',        value: '✘' },
            { label: '⚠  警告',          value: '⚠' },
            { label: '⛔  禁止',          value: '⛔' },
            { label: '☣  生化危害',      value: '☣' },
            { label: '☢  放射警告',      value: '☢' },
            { label: '☠  骷髏',          value: '☠' },
            // ── 幾何 ─────────────────────────────────────
            { label: '◈  菱框',          value: '◈' },
            { label: '◆  實心菱',        value: '◆' },
            { label: '◇  空心菱',        value: '◇' },
            { label: '◉  靶心圓',        value: '◉' },
            { label: '●  實心圓',        value: '●' },
            { label: '○  空心圓',        value: '○' },
            { label: '▲  實心三角',      value: '▲' },
            { label: '△  空心三角',      value: '△' },
            { label: '▼  倒三角',        value: '▼' },
            { label: '■  實心方',        value: '■' },
            { label: '□  空心方',        value: '□' },
            // ── 數學符號 ─────────────────────────────────
            { label: '⊕  加號圓',        value: '⊕' },
            { label: '⊗  叉號圓',        value: '⊗' },
            { label: '⊞  加號方',        value: '⊞' },
            { label: '⊟  減號方',        value: '⊟' },
            { label: '⊠  叉號方',        value: '⊠' },
            { label: '⊡  點號方',        value: '⊡' },
            { label: '⎔  六角形',        value: '⎔' },
            { label: '∞  無限',          value: '∞' },
            { label: '≡  三橫線',        value: '≡' },
            { label: '∅  空集合',        value: '∅' },
            // ── 箭頭 / 指向 ──────────────────────────────
            { label: '►  右箭頭',        value: '►' },
            { label: '◄  左箭頭',        value: '◄' },
            { label: '▶  右三角',        value: '▶' },
            { label: '◀  左三角',        value: '◀' },
            { label: '⟁  三角形',        value: '⟁' },
            // ── 科技 / 神秘 ──────────────────────────────
            { label: '👁  眼睛',          value: '👁' },
            { label: '🔍  放大鏡',        value: '🔍' },
            { label: '🔒  鎖',            value: '🔒' },
            { label: '💀  骷髏臉',        value: '💀' },
            { label: '📡  雷達',          value: '📡' },
            { label: '⌛  沙漏',          value: '⌛' },
            { label: '⚡  閃電',          value: '⚡' },
            { label: '✦  四角星',        value: '✦' },
            { label: '✧  空心四角星',    value: '✧' },
            { label: '☽  新月',          value: '☽' },
          ],
        }),
        published: fields.checkbox({ label: '已發布', defaultValue: true }),
        featured: fields.checkbox({ label: '精選置頂', defaultValue: false }),
        series: fields.text({ label: '系列名稱（選填）' }),
        seriesOrder: fields.integer({ label: '系列順序（選填）' }),
        content: fields.markdoc({
          label: '內容',
          extension: 'md',
          options: {
            image: {
              directory: 'public/img',
              publicPath: '/img/',
            },
          },
        }),
      },
    }),
  },

  singletons: {
    curatedLists: singleton({
      label: '精選清單',
      path: 'src/data/curated-lists',
      format: { data: 'json' },
      schema: {
        starter: fields.object({
          label: fields.text({ label: '清單名稱', defaultValue: '入門推薦' }),
          icon: fields.text({ label: '圖示符號', defaultValue: '◈' }),
          slugs: fields.array(
            fields.relationship({ label: '故事', collection: 'stories' }),
            { label: '故事清單', itemLabel: (props) => props.value ?? '（未選擇）' }
          ),
        }, { label: '入門推薦' }),
        thriller: fields.object({
          label: fields.text({ label: '清單名稱', defaultValue: '深度驚悚' }),
          icon: fields.text({ label: '圖示符號', defaultValue: '⊕' }),
          slugs: fields.array(
            fields.relationship({ label: '故事', collection: 'stories' }),
            { label: '故事清單', itemLabel: (props) => props.value ?? '（未選擇）' }
          ),
        }, { label: '深度驚悚' }),
      },
    }),
  },
});
