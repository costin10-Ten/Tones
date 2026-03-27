import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  const userId = locals.auth?.()?.userId ?? null;
  if (!userId) return new Response('Unauthorized', { status: 401 });

  // Run all 3 queries in parallel with a 7s timeout
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 5000);

  let userTokens, storyStats, bookmarkData, readData;
  try {
    [
      { data: userTokens },
      { data: storyStats },
      { data: bookmarkData },
      { data: readData },
    ] = await Promise.all([
      supabase.from('user_tokens').select('story_slug').eq('user_id', userId).abortSignal(abort.signal),
      supabase.from('story_stats').select('story_slug, views, tokens').limit(500).abortSignal(abort.signal),
      supabase.from('bookmarks').select('story_slug').eq('user_id', userId).abortSignal(abort.signal),
      supabase.from('reading_progress').select('story_slug').eq('user_id', userId).gte('pct', 90).abortSignal(abort.signal),
    ]);
  } catch (err: unknown) {
    clearTimeout(timer);
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    return new Response(JSON.stringify({ error: isTimeout ? 'timeout' : 'db_error' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  clearTimeout(timer);

  const tokenedSlugs = new Set((userTokens ?? []).map((r: { story_slug: string }) => r.story_slug));
  const bookmarkedSlugs = (bookmarkData ?? []).map((r: { story_slug: string }) => r.story_slug);

  const statsMap: Record<string, { views: number; tokens: number }> = {};
  let totalViews = 0;
  for (const row of storyStats ?? []) {
    statsMap[row.story_slug] = { views: row.views, tokens: row.tokens };
    totalViews += row.views;
  }

  const readSlugs = (readData ?? []).map((r: { story_slug: string }) => r.story_slug);

  return new Response(JSON.stringify({
    totalViews,
    userTokenCount: tokenedSlugs.size,
    tokenedSlugs: [...tokenedSlugs],
    bookmarkedSlugs,
    statsMap,
    readSlugs,
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'private, max-age=60, stale-while-revalidate=120',
    },
  });
};
