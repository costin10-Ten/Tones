import type { APIRoute } from 'astro';
import { getEntry } from 'astro:content';
import { ImageResponse } from '@vercel/og';
import React from 'react';

export const prerender = false;

// Fetch a Chinese font subset containing only the glyphs we need
async function fetchChineseFont(text: string): Promise<ArrayBuffer | null> {
  try {
    const unique = [...new Set(text)].join('');
    const cssUrl =
      `https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@700&text=${encodeURIComponent(unique)}`;
    const css = await fetch(cssUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    }).then((r) => r.text());

    const match = css.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/);
    if (!match) return null;
    return fetch(match[1]).then((r) => r.arrayBuffer());
  } catch {
    return null;
  }
}

export const GET: APIRoute = async ({ params }) => {
  const slug = params.slug;
  if (!slug) return new Response('Not Found', { status: 404 });

  const entry = await getEntry('stories', slug);
  if (!entry || !entry.data.published) return new Response('Not Found', { status: 404 });

  const { title, fileNum, excerpt, tags } = entry.data;

  const allText = '弦音異象' + title + (excerpt ?? '');
  const fontData = await fetchChineseFont(allText);
  const fonts = fontData
    ? [{ name: 'NotoSerif', data: fontData, weight: 700 as const, style: 'normal' as const }]
    : [];
  const ff = fontData ? 'NotoSerif, serif' : 'serif';

  const shortExcerpt =
    (excerpt ?? '').slice(0, 68) + ((excerpt ?? '').length > 68 ? '…' : '');

  const el = React.createElement(
    'div',
    {
      style: {
        width: '1200px',
        height: '630px',
        background: '#080808',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '56px 72px',
        fontFamily: ff,
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
      },
    },

    // Top: site name + file number
    React.createElement(
      'div',
      { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
      React.createElement(
        'div',
        { style: { fontSize: '26px', fontWeight: 700, color: '#d90429', letterSpacing: '0.12em' } },
        '弦音異象',
      ),
      React.createElement(
        'div',
        { style: { fontSize: '15px', color: '#444', fontFamily: 'monospace', letterSpacing: '0.2em' } },
        fileNum,
      ),
    ),

    // Title
    React.createElement(
      'div',
      {
        style: {
          fontSize: title.length > 14 ? '50px' : '66px',
          fontWeight: 700,
          color: '#f0f0f0',
          lineHeight: '1.3',
          letterSpacing: '0.05em',
          maxWidth: '960px',
        },
      },
      title,
    ),

    // Bottom: excerpt + tags
    React.createElement(
      'div',
      { style: { display: 'flex', flexDirection: 'column', gap: '20px' } },
      React.createElement(
        'div',
        {
          style: {
            fontSize: '21px',
            color: '#666',
            lineHeight: '1.75',
            maxWidth: '960px',
          },
        },
        shortExcerpt,
      ),
      React.createElement(
        'div',
        { style: { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' } },
        ...tags.slice(0, 4).map((tag) =>
          React.createElement(
            'span',
            {
              key: tag,
              style: {
                fontSize: '16px',
                color: '#d90429',
                border: '1px solid rgba(217,4,41,0.35)',
                padding: '4px 14px',
                letterSpacing: '0.08em',
              },
            },
            tag,
          ),
        ),
      ),
    ),

    // Bottom accent bar
    React.createElement('div', {
      style: {
        position: 'absolute',
        bottom: '0',
        left: '0',
        right: '0',
        height: '3px',
        background: 'linear-gradient(90deg, #d90429 0%, transparent 80%)',
      },
    }),

    // Subtle horizontal grid lines
    React.createElement('div', {
      style: {
        position: 'absolute',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        backgroundImage:
          'repeating-linear-gradient(0deg, transparent, transparent 59px, rgba(255,255,255,0.015) 60px)',
        pointerEvents: 'none',
      },
    }),
  );

  return new ImageResponse(el, { width: 1200, height: 630, fonts });
};
