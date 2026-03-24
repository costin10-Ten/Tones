import { defineCollection, z } from 'astro:content';

const clueSchema = z.object({
  id: z.string(),
  type: z.enum(['artifact', 'testimony', 'digital', 'documentary']),
  content: z.string(),
  weight: z.union([
    z.literal(1), z.literal(2), z.literal(3),
    // Keystatic fields.select stores string values; coerce to number
    z.literal('1').transform(() => 1 as const),
    z.literal('2').transform(() => 2 as const),
    z.literal('3').transform(() => 3 as const),
  ]).default(1),
  isRedHerring: z.boolean().default(false),
  linkedClues: z.array(z.string()).optional(),
  confirmsHypothesis: z.array(z.string()).optional(),
});

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
    published: z.boolean().default(true),
    featured: z.boolean().default(false),
    series: z.string().optional(),
    seriesOrder: z.number().optional(),
    clues: z.array(clueSchema).optional().default([]),
  }),
});

export type Clue = z.infer<typeof clueSchema>;

export const collections = {
  stories: storiesCollection,
};
