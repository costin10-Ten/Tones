import { defineCollection, z } from 'astro:content';

const storiesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    fileNum: z.string(),
    date: z.string(),
    readTime: z.string(),
    tags: z.array(z.string()),
    level: z.enum(['public', 'restricted', 'top-secret', 'paid']),
    excerpt: z.string(),
    author: z.string().default('弦音觀測者'),
    vis: z.enum(['v1', 'v2', 'v3', 'v4', 'v5']).default('v1'),
    icon: z.string().default('✖'),
    uploadDate: z.string().optional(),
    published: z.boolean().default(true),
    featured: z.boolean().default(false),
    series: z.string().optional(),
    seriesOrder: z.number().optional(),
  }),
});

export const collections = {
  stories: storiesCollection,
};
