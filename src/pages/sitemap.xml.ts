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
    { url: base + '/tags', priority: '0.7', changefreq: 'weekly' },
    { url: base + '/about', priority: '0.5', changefreq: 'monthly' },
    { url: base + '/history', priority: '0.5', changefreq: 'monthly' },
  ];

  // Use uploadDate (real publish date) or fall back to date field; normalise to YYYY-MM-DD
  function toIso(raw: string | undefined): string | null {
    if (!raw) return null;
    // Accept YYYY-MM-DD, YYYY.MM.DD, YYYY/MM/DD
    const m = raw.match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})$/);
    if (!m) return null;
    return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  }

  const today = new Date().toISOString().slice(0, 10);

  const storyPages = sorted.map(s => ({
    url: `${base}/stories/${s.slug}`,
    priority: s.data.featured ? '0.9' : '0.8',
    changefreq: 'monthly',
    lastmod: toIso(s.data.uploadDate ?? s.data.date) ?? today,
  }));

  const allPages = [...staticPages, ...storyPages];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages.map(p => `  <url>
    <loc>${p.url}</loc>${'lastmod' in p && p.lastmod ? `\n    <lastmod>${p.lastmod}</lastmod>` : ''}
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
