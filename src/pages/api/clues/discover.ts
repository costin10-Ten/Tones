/**
 * POST /api/clues/discover
 * 在用戶閱讀故事達到一定進度後呼叫，解鎖該故事的線索並更新假設置信度。
 *
 * Body: { slug: string }
 */

import type { APIRoute } from 'astro';
import { getEntry } from 'astro:content';
import { supabase } from '../../../lib/supabase';
import hypothesesData from '../../../data/hypotheses.json';

export const prerender = false;

// 貝氏更新乘數
const TYPE_MULTIPLIER: Record<string, number> = {
  documentary: 1.5,
  artifact:    1.2,
  digital:     1.0,
  testimony:   0.8,
};

const SLUG_RE = /^[a-z0-9-]+$/;

export const POST: APIRoute = async ({ request, locals }) => {
  const userId = locals.auth?.()?.userId ?? null;
  if (!userId) return new Response('Unauthorized', { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return new Response('Bad request', { status: 400 });
  }

  const { slug } = body as Record<string, unknown>;
  if (typeof slug !== 'string' || !SLUG_RE.test(slug)) {
    return new Response('Bad request', { status: 400 });
  }

  // 取得故事及其線索
  const entry = await getEntry('stories', slug);
  if (!entry || !entry.data.published) {
    return new Response('Not found', { status: 404 });
  }

  const clues = entry.data.clues ?? [];
  if (clues.length === 0) {
    return new Response(JSON.stringify({ ok: true, discovered: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 查詢已發現的線索，避免重複計算
  const clueIds = clues.map(c => c.id);
  const { data: existing } = await supabase
    .from('clue_discoveries')
    .select('clue_id')
    .eq('user_id', userId)
    .in('clue_id', clueIds);

  const existingSet = new Set((existing ?? []).map((r: { clue_id: string }) => r.clue_id));
  const newClues = clues.filter(c => !existingSet.has(c.id));

  if (newClues.length === 0) {
    return new Response(JSON.stringify({ ok: true, discovered: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 插入新線索發現
  const insertRows = newClues.map(c => ({
    clue_id: c.id,
    user_id: userId,
    story_slug: slug,
  }));

  const { error: insertError } = await supabase
    .from('clue_discoveries')
    .insert(insertRows);

  if (insertError) {
    return new Response(JSON.stringify({ error: 'db_error' }), { status: 500 });
  }

  // ── 更新假設置信度（貝氏更新機制）──────────────────────────────
  // 收集新線索所支持的假設，按假設 ID 分組計算增量
  const hypothesisDeltas: Record<string, number> = {};

  for (const clue of newClues) {
    if (clue.isRedHerring) continue; // 紅鯡魚不貢獻置信度

    const hypoIds = clue.confirmsHypothesis ?? [];
    const multiplier = TYPE_MULTIPLIER[clue.type] ?? 1.0;
    const delta = clue.weight * multiplier * 10; // 基礎 10 分 × 權重 × 類型乘數

    for (const hypoId of hypoIds) {
      hypothesisDeltas[hypoId] = (hypothesisDeltas[hypoId] ?? 0) + delta;
    }
  }

  // 為每個受影響的假設 upsert 進度
  for (const [hypoId, delta] of Object.entries(hypothesisDeltas)) {
    const hypo = (hypothesesData as Array<{ id: string; thresholds: { partial: number; significant: number; confirmed: number } }>)
      .find(h => h.id === hypoId);
    if (!hypo) continue;

    // 讀取現有置信度
    const { data: existing } = await supabase
      .from('hypothesis_progress')
      .select('confidence')
      .eq('hypothesis_id', hypoId)
      .eq('user_id', userId)
      .single();

    const oldConfidence = existing?.confidence ?? 0;
    const newConfidence = Math.min(100, Math.round(oldConfidence + delta));

    const status =
      newConfidence >= hypo.thresholds.confirmed   ? 'confirmed'   :
      newConfidence >= hypo.thresholds.significant ? 'significant' :
      newConfidence >= hypo.thresholds.partial     ? 'partial'     : 'locked';

    await supabase.from('hypothesis_progress').upsert({
      hypothesis_id: hypoId,
      user_id: userId,
      confidence: newConfidence,
      status,
      updated_at: new Date().toISOString(),
    });
  }

  return new Response(JSON.stringify({
    ok: true,
    discovered: newClues.length,
    clues: newClues.map(c => ({ id: c.id, type: c.type, content: c.content })),
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
