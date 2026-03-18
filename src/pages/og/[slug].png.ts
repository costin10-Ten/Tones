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
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: controller.signal,
    }).then((r) => r.text());
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
  const shortExcerpt = (excerpt ?? '').slice(0, 62) + ((excerpt ?? '').length > 62 ? '…' : '');

  const c = React.createElement;

  const el = c('div', {
    style: {
      width: '1200px', height: '630px',
      background: '#070707',
      display: 'flex',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: ff,
    },
  },

    // ── Faint file-num watermark ────────────────────────────────────
    c('div', {
      style: {
        position: 'absolute',
        right: '-20px', bottom: '-30px',
        fontSize: '260px',
        fontFamily: 'monospace',
        fontWeight: 900,
        color: 'rgba(255,255,255,0.022)',
        letterSpacing: '-0.03em',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        transform: 'rotate(-8deg)',
        transformOrigin: 'bottom right',
      },
    }, fileNum),

    // ── Scanline texture ────────────────────────────────────────────
    c('div', {
      style: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage:
          'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.18) 2px, rgba(0,0,0,0.18) 3px)',
        zIndex: 1,
        pointerEvents: 'none',
      },
    }),

    // ── Vignette (dark edges) ───────────────────────────────────────
    c('div', {
      style: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        background:
          'radial-gradient(ellipse 90% 90% at 40% 50%, transparent 30%, rgba(0,0,0,0.78) 100%)',
        zIndex: 2,
        pointerEvents: 'none',
      },
    }),

    // ── Left accent bar ─────────────────────────────────────────────
    c('div', {
      style: {
        position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px',
        background: 'linear-gradient(180deg, transparent 0%, #d90429 25%, #d90429 75%, transparent 100%)',
        zIndex: 4,
      },
    }),

    // ── Top edge line ───────────────────────────────────────────────
    c('div', {
      style: {
        position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
        background: 'linear-gradient(90deg, #d90429 0%, rgba(217,4,41,0.2) 50%, transparent 100%)',
        zIndex: 4,
      },
    }),

    // ── Bottom edge line ────────────────────────────────────────────
    c('div', {
      style: {
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px',
        background: 'linear-gradient(90deg, #d90429 0%, rgba(217,4,41,0.15) 60%, transparent 100%)',
        zIndex: 4,
      },
    }),

    // ── Main content ────────────────────────────────────────────────
    c('div', {
      style: {
        position: 'relative', zIndex: 5,
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '50px 76px 54px 80px',
        flex: 1,
      },
    },

      // Header row: site name + line + file number
      c('div', {
        style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
      },
        c('div', {
          style: {
            fontSize: '23px', fontWeight: 700, color: '#d90429',
            letterSpacing: '0.15em',
          },
        }, '弦音異象'),
        c('div', {
          style: { display: 'flex', alignItems: 'center', gap: '14px' },
        },
          c('div', {
            style: { width: '64px', height: '1px', background: 'rgba(217,4,41,0.4)' },
          }),
          c('div', {
            style: {
              fontSize: '13px', color: '#4a4a4a',
              fontFamily: 'monospace', letterSpacing: '0.22em',
            },
          }, fileNum),
        ),
      ),

      // Title
      c('div', {
        style: {
          fontSize: title.length > 13 ? '54px' : '70px',
          fontWeight: 700,
          color: '#eaeaea',
          lineHeight: '1.22',
          letterSpacing: '0.04em',
          maxWidth: '920px',
          textShadow: '0 0 40px rgba(217,4,41,0.15)',
        },
      }, title),

      // Bottom block
      c('div', { style: { display: 'flex', flexDirection: 'column', gap: '16px' } },
        // Short red rule
        c('div', {
          style: { width: '40px', height: '1px', background: 'rgba(217,4,41,0.55)' },
        }),

        // Excerpt
        c('div', {
          style: {
            fontSize: '19px', color: '#585858',
            lineHeight: '1.72', maxWidth: '920px',
          },
        }, shortExcerpt),

        // Tags
        c('div', {
          style: { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' },
        },
          ...tags.slice(0, 4).map((tag) =>
            c('span', {
              key: tag,
              style: {
                fontSize: '14px', color: '#d90429',
                border: '1px solid rgba(217,4,41,0.3)',
                padding: '3px 13px',
                letterSpacing: '0.1em',
                background: 'rgba(217,4,41,0.07)',
              },
            }, tag),
          ),
        ),
      ),
    ),
  );

  try {
    return new ImageResponse(el, { width: 1200, height: 630, fonts });
  } catch {
    const fallback = c('div', {
      style: {
        width: '1200px', height: '630px', background: '#070707',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: 'monospace', gap: '24px',
      },
    },
      c('div', { style: { fontSize: '16px', color: '#d90429', letterSpacing: '0.28em' } }, 'ANOMALY ARCHIVES'),
      c('div', { style: { fontSize: '90px', color: '#e8e8e8', letterSpacing: '0.08em' } }, fileNum),
      c('div', { style: { width: '100px', height: '2px', background: '#d90429' } }),
      c('div', { style: { fontSize: '16px', color: '#333', letterSpacing: '0.2em' } }, 'tones-pi.vercel.app'),
    );
    return new ImageResponse(fallback, { width: 1200, height: 630 });
  }
};
