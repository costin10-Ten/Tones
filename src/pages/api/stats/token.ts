import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const prerender = false;

const VALID_ACTIONS = new Set(['add', 'remove']);
const SLUG_RE = /^[a-z0-9-]+$/;

// Per-IP rate limit for anonymous token actions: max 20 per minute
const ANON_TOKEN_LIMIT = 20;
const ANON_TOKEN_WINDOW_MS = 60_000;
const anonTokenTimestamps = new Map<string, number[]>();

function isAnonRateLimited(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - ANON_TOKEN_WINDOW_MS;
  const times = (anonTokenTimestamps.get(ip) ?? []).filter(t => t > cutoff);
  if (times.length >= ANON_TOKEN_LIMIT) return true;
  times.push(now);
  anonTokenTimestamps.set(ip, times);
  if (anonTokenTimestamps.size > 1000) {
    for (const [k, ts] of anonTokenTimestamps) {
      if (!ts.some(t => t > cutoff)) anonTokenTimestamps.delete(k);
    }
  }
  return false;
}

// Per-user rate limit for authenticated token actions: max 30 per minute
const AUTH_TOKEN_LIMIT = 30;
const AUTH_TOKEN_WINDOW_MS = 60_000;
const authTokenTimestamps = new Map<string, number[]>();

function isAuthRateLimited(userId: string): boolean {
  const now = Date.now();
  const cutoff = now - AUTH_TOKEN_WINDOW_MS;
  const times = (authTokenTimestamps.get(userId) ?? []).filter(t => t > cutoff);
  if (times.length >= AUTH_TOKEN_LIMIT) return true;
  times.push(now);
  authTokenTimestamps.set(userId, times);
  if (authTokenTimestamps.size > 500) {
    for (const [k, ts] of authTokenTimestamps) {
      if (!ts.some(t => t > cutoff)) authTokenTimestamps.delete(k);
    }
  }
  return false;
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export const POST: APIRoute = async ({ request, locals }) => {
  let body: unknown;
  try { body = await request.json(); } catch { return new Response('Bad request', { status: 400 }); }

  const { slug, action } = body as Record<string, unknown>;
  if (typeof slug !== 'string' || !SLUG_RE.test(slug)) return new Response('Bad request', { status: 400 });
  if (!VALID_ACTIONS.has(action as string)) return new Response('Bad request', { status: 400 });

  const userId = locals.auth?.()?.userId ?? null;

  if (userId) {
    // Logged-in: track in user_tokens + update global count
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
    // Anonymous: rate-limit by IP, then only allow add (remove requires account to prevent abuse)
    if (action === 'remove')
      return new Response(JSON.stringify({ error: '請登入後再移除金幣' }), { status: 401, headers: JSON_HEADERS });

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    if (isAnonRateLimited(ip))
      return new Response(JSON.stringify({ error: '操作過於頻繁，請稍後再試' }), { status: 429, headers: JSON_HEADERS });

    const { error: rpcErr } = await supabase.rpc('increment_token', { p_slug: slug });
    if (rpcErr) return new Response(JSON.stringify({ error: '操作失敗，請稍後再試' }), { status: 500, headers: JSON_HEADERS });
  }

  const { data } = await supabase
    .from('story_stats')
    .select('tokens')
    .eq('story_slug', slug)
    .single();

  return new Response(JSON.stringify({ tokens: data?.tokens ?? 0 }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
