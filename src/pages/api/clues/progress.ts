/**
 * GET /api/clues/progress
 * 回傳用戶已發現的線索清單及各假設的推理進度。
 */

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { supabase } from '../../../lib/supabase';
import hypothesesData from '../../../data/hypotheses.json';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  const userId = locals.auth?.()?.userId ?? null;
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 7000);

  let discoveryData, progressData;
  try {
    [
      { data: discoveryData },
      { data: progressData },
    ] = await Promise.all([
      supabase
        .from('clue_discoveries')
        .select('clue_id, story_slug, discovered_at')
        .eq('user_id', userId)
        .abortSignal(abort.signal),
      supabase
        .from('hypothesis_progress')
        .select('hypothesis_id, confidence, status, updated_at')
        .eq('user_id', userId)
        .abortSignal(abort.signal),
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

  // 建立已發現線索的 Set
  const discoveredIds = new Set(
    (discoveryData ?? []).map((r: { clue_id: string }) => r.clue_id)
  );
  const discoveryMap: Record<string, { story_slug: string; discovered_at: string }> = {};
  for (const row of discoveryData ?? []) {
    discoveryMap[row.clue_id] = { story_slug: row.story_slug, discovered_at: row.discovered_at };
  }

  // 從內容集合取所有已發現線索的完整資料
  const allStories = await getCollection('stories', ({ data }) => data.published);
  const discoveredClues: Array<{
    id: string;
    type: string;
    content: string;
    weight: number;
    isRedHerring: boolean;
    sourceFile: string;
    storyTitle: string;
    storySlug: string;
    discoveredAt: string;
  }> = [];

  for (const story of allStories) {
    for (const clue of story.data.clues ?? []) {
      if (discoveredIds.has(clue.id)) {
        const disc = discoveryMap[clue.id];
        discoveredClues.push({
          id: clue.id,
          type: clue.type,
          content: clue.content,
          weight: clue.weight,
          isRedHerring: clue.isRedHerring,
          sourceFile: story.data.fileNum,
          storyTitle: story.data.title,
          storySlug: story.slug,
          discoveredAt: disc.discovered_at,
        });
      }
    }
  }

  // 建立假設進度 Map
  const progressMap: Record<string, { confidence: number; status: string; updated_at: string }> = {};
  for (const row of progressData ?? []) {
    progressMap[row.hypothesis_id] = {
      confidence: row.confidence,
      status: row.status,
      updated_at: row.updated_at,
    };
  }

  // 組合所有假設（含未開始的）
  const hypotheses = (hypothesesData as Array<{
    id: string;
    title: string;
    description: string;
    type: string;
    thresholds: { partial: number; significant: number; confirmed: number };
    rewardOnConfirm: string;
    rewardId: string;
  }>).map(h => {
    const prog = progressMap[h.id];
    return {
      id: h.id,
      title: h.title,
      description: h.description,
      type: h.type,
      confidence: prog?.confidence ?? 0,
      status: prog?.status ?? 'locked',
      thresholds: h.thresholds,
      rewardOnConfirm: h.rewardOnConfirm,
      rewardId: prog?.status === 'confirmed' ? h.rewardId : null,
      updatedAt: prog?.updated_at ?? null,
    };
  });

  return new Response(JSON.stringify({
    discoveredClues,
    totalDiscovered: discoveredClues.length,
    hypotheses,
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'private, max-age=60, stale-while-revalidate=120',
    },
  });
};
