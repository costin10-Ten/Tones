import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const prerender = false;

const SLUG_RE = /^[a-z0-9-]+$/;
const COOLDOWN_MS = 60_000; // 1 minute per IP+slug
const seen = new Map<string, number>();

export const POST: APIRoute = async ({ request }) => {
  let body: unknown;
  try { body = await request.json(); } catch { return new Response('Bad request', { status: 400 }); }
  const { slug } = body as Record<string, unknown>;
  if (typeof slug !== 'string' || !SLUG_RE.test(slug)) return new Response('Bad request', { status: 400 });

  // Deduplicate: same IP + slug within cooldown window → skip DB write
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const key = `${ip}:${slug}`;
  const now = Date.now();
  const last = seen.get(key) ?? 0;
  if (now - last < COOLDOWN_MS) {
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
  seen.set(key, now);
  // Evict old entries every 500 inserts to prevent unbounded memory growth
  if (seen.size > 500) {
    const cutoff = now - COOLDOWN_MS;
    for (const [k, t] of seen) { if (t < cutoff) seen.delete(k); }
  }

  const { error } = await supabase.rpc('increment_view', { p_slug: slug });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
