import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const { slug } = params;
  if (!slug) return new Response('Bad request', { status: 400 });

  const { data, error } = await supabase
    .from('story_stats')
    .select('views, tokens')
    .eq('story_slug', slug)
    .single();

  if (error && error.code !== 'PGRST116') {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ views: data?.views ?? 0, tokens: data?.tokens ?? 0 }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
