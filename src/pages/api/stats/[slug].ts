import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const prerender = false;

const SLUG_RE = /^[a-z0-9-]+$/;

export const GET: APIRoute = async ({ params }) => {
  const { slug } = params;
  if (!slug || !SLUG_RE.test(slug)) return new Response('Bad request', { status: 400 });

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
