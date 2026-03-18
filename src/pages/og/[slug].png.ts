import type { APIRoute } from 'astro';
import { getEntry } from 'astro:content';
import { ImageResponse } from '@vercel/og';
import React from 'react';

export const prerender = false;

async function fetchChineseFont(text: string): Promise<ArrayBuffer | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const unique = [...new Set(text)].join('');
    const cssUrl = `https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@700&text=${encodeURIComponent(unique)}`;
    const css = await fetch(cssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      signal: controller.signal,
    }).then((r) => r.text());

    // Handle both quoted and unquoted URLs: url(...) or url('...')
    const match = css.match(/url\(['"]?(https:\/\/fonts\.gstatic\.com[^'")\s]+)['"]?\)/);
    if (!match) return null;

    const buf = await fetch(match[1], { signal: controller.signal }).then((r) => r.arrayBuffer());
    clearTimeout(timer);
    return buf;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

export const GET: APIRoute = async ({ params }) => {
  const slug = params.slug;
  if (!slug) return new Response('Not Found', { status: 404 });

  const entry = await getEntry('stories', slug);
  if (!entry || !entry.data.published) return new Response('Not Found', { status: 404 });

  const { title, fileNum, excerpt, tags } = entry.data;

  const fontData = await fetchChineseFont('弦音異象' + title + (excerpt ?? ''));
  const fonts = fontData
    ? [{ name: 'NotoSerif', data: fontData, weight: 700 as const, style: 'normal' as const }]
    : [];
  const ff = fontData ? 'NotoSerif, serif' : 'serif';

  const shortExcerpt = (excerpt ?? '').slice(0, 68) + ((excerpt ?? '').length > 68 ? '…' : '');

  // ── Layout helpers ──────────────────────────────────────────────────
  const c = React.createElement;

  const rootStyle: React.CSSProperties = {
    width: '1200px', height: '630px',
    background: '#080808',
    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
    padding: '56px 72px',
    fontFamily: ff,
    position: 'relative', overflow: 'hidden', boxSizing: 'border-box',
  };

  const el = c('div', { style: rootStyle },
    // Top row
    c('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
      c('div', { style: { fontSize: '26px', fontWeight: 700, color: '#d90429', letterSpacing: '0.12em' } }, '弦音異象'),
      c('div', { style: { fontSize: '15px', color: '#444', fontFamily: 'monospace', letterSpacing: '0.2em' } }, fileNum),
    ),
    // Title
    c('div', {
      style: {
        fontSize: title.length > 14 ? '50px' : '66px',
        fontWeight: 700, color: '#f0f0f0',
        lineHeight: '1.3', letterSpacing: '0.05em', maxWidth: '960px',
      },
    }, title),
    // Bottom block
    c('div', { style: { display: 'flex', flexDirection: 'column', gap: '20px' } },
      c('div', { style: { fontSize: '21px', color: '#666', lineHeight: '1.75', maxWidth: '960px' } }, shortExcerpt),
      c('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' } },
        ...tags.slice(0, 4).map((tag) =>
          c('span', {
            key: tag,
            style: { fontSize: '16px', color: '#d90429', border: '1px solid rgba(217,4,41,0.35)', padding: '4px 14px', letterSpacing: '0.08em' },
          }, tag),
        ),
      ),
    ),
    // Accent bar
    c('div', { style: { position: 'absolute', bottom: '0', left: '0', right: '0', height: '3px', background: 'linear-gradient(90deg, #d90429 0%, transparent 80%)' } }),
    // Grid lines
    c('div', { style: { position: 'absolute', top: '0', left: '0', right: '0', bottom: '0', backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 59px, rgba(255,255,255,0.015) 60px)', pointerEvents: 'none' } }),
  );

  try {
    return new ImageResponse(el, { width: 1200, height: 630, fonts });
  } catch {
    // Ultimate fallback: plain file-number card
    const fallback = c('div', {
      style: {
        width: '1200px', height: '630px', background: '#080808',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'monospace', gap: '24px',
      },
    },
      c('div', { style: { fontSize: '18px', color: '#d90429', letterSpacing: '0.25em' } }, 'ANOMALY ARCHIVES'),
      c('div', { style: { fontSize: '80px', color: '#f0f0f0', letterSpacing: '0.1em' } }, fileNum),
      c('div', { style: { width: '120px', height: '2px', background: '#d90429' } }),
      c('div', { style: { fontSize: '18px', color: '#444', letterSpacing: '0.2em' } }, 'tones-pi.vercel.app'),
    );
    return new ImageResponse(fallback, { width: 1200, height: 630 });
  }
};
