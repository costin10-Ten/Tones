import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const prerender = false;

export const GET: APIRoute = async () => {
  const { data } = await supabase
    .from('story_stats')
    .select('story_slug, views, tokens')
    .limit(500);

  let totalViews = 0, totalTokens = 0;
  const perStory: Record<string, number> = {};
  for (const row of data ?? []) {
    totalViews  += row.views  ?? 0;
    totalTokens += row.tokens ?? 0;
    if (row.story_slug) perStory[row.story_slug] = row.views ?? 0;
  }

  return new Response(JSON.stringify({ totalViews, totalTokens, perStory }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=120',
    },
  });
};
