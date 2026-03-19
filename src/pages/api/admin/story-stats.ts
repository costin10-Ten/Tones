import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  // Require login to view stats
  const userId = locals.auth?.()?.userId ?? null;
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const { data, error } = await supabase
    .from('story_stats')
    .select('story_slug, views, tokens, updated_at')
    .order('views', { ascending: false });

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify(data ?? []), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
};
