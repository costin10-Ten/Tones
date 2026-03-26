import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { createRateLimiter } from '../../../lib/rate-limit';

export const prerender = false;

const VALID_ACTIONS = new Set(['add', 'remove']);
const SLUG_RE = /^[a-z0-9-]+$/;

const { isLimited: isAuthRateLimited } = createRateLimiter(30, 60_000);

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export const POST: APIRoute = async ({ request, locals }) => {
  let body: unknown;
  try { body = await request.json(); } catch { return new Response('Bad request', { status: 400 }); }

  const { slug, action } = body as Record<string, unknown>;
  if (typeof slug !== 'string' || !SLUG_RE.test(slug)) return new Response('Bad request', { status: 400 });
  if (!VALID_ACTIONS.has(action as string)) return new Response('Bad request', { status: 400 });

  const userId = locals.auth?.()?.userId ?? null;

  if (userId) {
    if (isAuthRateLimited(userId))
      return new Response(JSON.stringify({ error: '操作過於頻繁，請稍後再試' }), { status: 429, headers: JSON_HEADERS });

    if (action === 'add') {
      const { error: insertErr } = await supabase
        .from('user_tokens')
        .insert({ user_id: userId, story_slug: slug });

      if (insertErr && insertErr.code !== '23505') {
        return new Response(JSON.stringify({ error: '操作失敗，請稍後再試' }), { status: 500, headers: JSON_HEADERS });
      }
      if (!insertErr) {
        const { error: rpcErr } = await supabase.rpc('increment_token', { p_slug: slug });
        if (rpcErr) return new Response(JSON.stringify({ error: '操作失敗，請稍後再試' }), { status: 500, headers: JSON_HEADERS });
      }
    } else {
      // Only decrement the global counter if the user actually had a token to remove.
      // Using .select() so Supabase returns the deleted rows; an empty array means no row existed.
      const { data: deleted, error: delErr } = await supabase
        .from('user_tokens')
        .delete()
        .eq('user_id', userId)
        .eq('story_slug', slug)
        .select('user_id');

      if (delErr) return new Response(JSON.stringify({ error: '操作失敗，請稍後再試' }), { status: 500, headers: JSON_HEADERS });

      if (deleted && deleted.length > 0) {
        const { error: rpcErr } = await supabase.rpc('decrement_token', { p_slug: slug });
        if (rpcErr) return new Response(JSON.stringify({ error: '操作失敗，請稍後再試' }), { status: 500, headers: JSON_HEADERS });
      }
    }
  } else {
    // Anonymous users cannot give or remove tokens — membership required
    return new Response(JSON.stringify({ error: '請登入後才能給金幣', requiresAuth: true }), { status: 401, headers: JSON_HEADERS });
  }

  const { data } = await supabase
    .from('story_stats')
    .select('tokens')
    .eq('story_slug', slug)
    .single();

  return new Response(JSON.stringify({ tokens: data?.tokens ?? 0 }), {
    headers: JSON_HEADERS,
  });
};
