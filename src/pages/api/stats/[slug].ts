import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { createRateLimiter } from '../../../lib/rate-limit';

export const prerender = false;

const SLUG_RE = /^[a-z0-9-]+$/;

const statsReadLimiter = createRateLimiter(120, 60_000); // 120 reads/min per IP

export const GET: APIRoute = async ({ params, request }) => {
  const { slug } = params;
  if (!slug || !SLUG_RE.test(slug)) return new Response('Bad request', { status: 400 });

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (statsReadLimiter.isLimited(ip)) {
    return new Response('Too Many Requests', { status: 429, headers: { 'Retry-After': '60' } });
  }

  const { data, error } = await supabase
    .from('story_stats')
    .select('views, tokens')
    .eq('story_slug', slug)
    .single();

  if (error && error.code !== 'PGRST116') {
    return new Response(JSON.stringify({ error: '查詢失敗' }), { status: 500 });
  }

  return new Response(JSON.stringify({ views: data?.views ?? 0, tokens: data?.tokens ?? 0 }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=15, stale-while-revalidate=30',
    },
  });
};
