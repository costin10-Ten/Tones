import { config, fields, collection } from '@keystatic/core';

export default config({
  storage: {
    kind: 'local',
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
        tags: fields.array(fields.text({ label: '標籤' }), { label: '分類標籤' }),
        level: fields.select({
          label: '機密等級',
          options: [
            { label: '公開', value: 'public' },
            { label: '限制', value: 'restricted' },
            { label: '極密', value: 'top-secret' },
            { label: '付費', value: 'paid' },
          ],
          defaultValue: 'public',
        }),
        excerpt: fields.text({ label: '摘要', multiline: true }),
        author: fields.text({ label: '作者', defaultValue: '弦音觀測者' }),
        vis: fields.select({
          label: '視覺樣式',
          options: [
            { label: 'V1', value: 'v1' },
            { label: 'V2', value: 'v2' },
            { label: 'V3', value: 'v3' },
            { label: 'V4', value: 'v4' },
            { label: 'V5', value: 'v5' },
          ],
          defaultValue: 'v1',
        }),
        icon: fields.text({ label: '圖示符號', defaultValue: '✖' }),
        published: fields.checkbox({ label: '已發布', defaultValue: true }),
        content: fields.markdownEditor({ label: '內容' }),
      },
    }),
  },
});
