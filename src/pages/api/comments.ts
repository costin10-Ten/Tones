import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const prerender = false;

const SLUG_RE = /^[a-z0-9-]+$/;

// Per-user rate limit: max 5 comment submissions per minute
const COMMENT_LIMIT = 5;
const COMMENT_WINDOW_MS = 60_000;
const commentTimestamps = new Map<string, number[]>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const cutoff = now - COMMENT_WINDOW_MS;
  const times = (commentTimestamps.get(userId) ?? []).filter(t => t > cutoff);
  if (times.length >= COMMENT_LIMIT) return true;
  times.push(now);
  commentTimestamps.set(userId, times);
  // Evict stale entries periodically
  if (commentTimestamps.size > 200) {
    for (const [uid, ts] of commentTimestamps) {
      if (!ts.some(t => t > cutoff)) commentTimestamps.delete(uid);
    }
  }
  return false;
}

// GET /api/comments?slug=xxx  → list latest 50 comments
export const GET: APIRoute = async ({ url }) => {
  const slug = url.searchParams.get('slug') ?? '';
  if (!SLUG_RE.test(slug)) return new Response('Bad request', { status: 400 });

  const { data, error } = await supabase
    .from('comments')
    .select('id, display_name, content, created_at')
    .eq('story_slug', slug)
    .eq('deleted', false)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return new Response(JSON.stringify({ error: '操作失敗，請稍後再試' }), { status: 500 });
  return new Response(JSON.stringify(data ?? []), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
};

// POST /api/comments  body: { slug, content }  — auth required
export const POST: APIRoute = async ({ request, locals }) => {
  const userId = locals.auth?.()?.userId ?? null;
  if (!userId) return new Response('Unauthorized', { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch { return new Response('Bad request', { status: 400 }); }

  const { slug, content, displayName } = body as Record<string, unknown>;
  if (typeof slug !== 'string' || !SLUG_RE.test(slug)) return new Response('Bad request', { status: 400 });
  if (typeof content !== 'string' || content.trim().length === 0 || content.length > 500)
    return new Response('Invalid content', { status: 400 });

  if (isRateLimited(userId))
    return new Response(JSON.stringify({ error: '留言過於頻繁，請稍後再試' }), { status: 429 });

  const name = typeof displayName === 'string' && displayName.trim().length > 0
    ? displayName.trim().slice(0, 30)
    : '匿名觀測者';

  const { data, error } = await supabase
    .from('comments')
    .insert({ story_slug: slug, user_id: userId, display_name: name, content: content.trim() })
    .select('id, display_name, content, created_at')
    .single();

  if (error) return new Response(JSON.stringify({ error: '操作失敗，請稍後再試' }), { status: 500 });
  return new Response(JSON.stringify(data), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
