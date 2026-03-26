import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { createRateLimiter } from '../../../lib/rate-limit';

export const prerender = false;

const VALID_ACTIONS = new Set(['add', 'remove']);
const SLUG_RE = /^[a-z0-9-]+$/;

const { isLimited: isAnonRateLimited } = createRateLimiter(20, 60_000, 1000);
const { isLimited: isAuthRateLimited } = createRateLimiter(30, 60_000);

const JSON_HEADERS = { 'Content-Type': 'application/json' };
// POST responses must never be cached — the returned token count is live data
const NO_CACHE_HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };

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

    // Single atomic RPC: insert user_tokens + update story_stats in one transaction
    const rpcName = action === 'add' ? 'add_user_token' : 'remove_user_token';
    const { error } = await supabase.rpc(rpcName, { p_user_id: userId, p_slug: slug });
    if (error)
      return new Response(JSON.stringify({ error: '操作失敗，請稍後再試' }), { status: 500, headers: JSON_HEADERS });

  } else {
    // Anonymous: rate-limit by IP, only allow add (remove requires account to prevent abuse)
    if (action === 'remove')
      return new Response(JSON.stringify({ error: '請登入後再移除金幣' }), { status: 401, headers: JSON_HEADERS });

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    if (isAnonRateLimited(ip))
      return new Response(JSON.stringify({ error: '操作過於頻繁，請稍後再試' }), { status: 429, headers: JSON_HEADERS });

    const { error: rpcErr } = await supabase.rpc('increment_token', { p_slug: slug });
    if (rpcErr)
      return new Response(JSON.stringify({ error: '操作失敗，請稍後再試' }), { status: 500, headers: JSON_HEADERS });
  }

  const { data } = await supabase
    .from('story_stats')
    .select('tokens')
    .eq('story_slug', slug)
    .single();

  return new Response(JSON.stringify({ tokens: data?.tokens ?? 0 }), {
    headers: NO_CACHE_HEADERS,
  });
};
