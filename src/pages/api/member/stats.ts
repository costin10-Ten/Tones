import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  const userId = locals.auth?.()?.userId ?? null;
  if (!userId) return new Response('Unauthorized', { status: 401 });

  // Run all 3 queries in parallel — previously sequential (3× round-trip → 1× round-trip)
  const [
    { data: userTokens },
    { data: storyStats },
    { data: bookmarkData },
  ] = await Promise.all([
    supabase.from('user_tokens').select('story_slug').eq('user_id', userId),
    supabase.from('story_stats').select('story_slug, views, tokens'),
    supabase.from('bookmarks').select('story_slug').eq('user_id', userId),
  ]);

  const tokenedSlugs = new Set((userTokens ?? []).map((r: { story_slug: string }) => r.story_slug));
  const bookmarkedSlugs = (bookmarkData ?? []).map((r: { story_slug: string }) => r.story_slug);

  const statsMap: Record<string, { views: number; tokens: number }> = {};
  let totalViews = 0;
  for (const row of storyStats ?? []) {
    statsMap[row.story_slug] = { views: row.views, tokens: row.tokens };
    totalViews += row.views;
  }

  return new Response(JSON.stringify({
    totalViews,
    userTokenCount: tokenedSlugs.size,
    tokenedSlugs: [...tokenedSlugs],
    bookmarkedSlugs,
    statsMap,
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'private, max-age=300, stale-while-revalidate=600',
    },
  });
};
