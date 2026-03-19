import { config, fields, collection } from '@keystatic/core';

export default config({
  storage: import.meta.env.PROD
    ? {
        kind: 'github',
        repo: {
          owner: 'costin10-Ten',
          name: 'Tones',
        },
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
        tags: fields.array(fields.text({ label: '標籤' }), {
          label: '分類標籤',
          itemLabel: (props) => props.value,
        }),
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
        icon: fields.text({ label: '圖示符號', defaultValue: '✖' }),
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
});
