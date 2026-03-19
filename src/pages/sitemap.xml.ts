import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const prerender = true;

export const GET: APIRoute = async ({ site }) => {
  const base = site?.href.replace(/\/$/, '') ?? 'https://tones-pi.vercel.app';

  const stories = await getCollection('stories', ({ data }) => data.published);
  const sorted = stories.sort((a, b) => a.data.fileNum.localeCompare(b.data.fileNum));

  const staticPages = [
    { url: base + '/', priority: '1.0', changefreq: 'daily' },
    { url: base + '/stories', priority: '0.9', changefreq: 'daily' },
    { url: base + '/about', priority: '0.5', changefreq: 'monthly' },
    { url: base + '/history', priority: '0.5', changefreq: 'monthly' },
  ];

  const storyPages = sorted.map(s => ({
    url: `${base}/stories/${s.slug}`,
    priority: '0.8',
    changefreq: 'monthly',
  }));

  const allPages = [...staticPages, ...storyPages];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages.map(p => `  <url>
    <loc>${p.url}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
