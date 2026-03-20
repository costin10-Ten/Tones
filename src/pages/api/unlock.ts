import type { APIRoute } from 'astro';
import { getEntry } from 'astro:content';
import { supabase } from '../../lib/supabase';

export const prerender = false;

const SLUG_RE = /^[a-z0-9-]+$/;

// POST /api/unlock  body: { slug }  — auth required
// WARNING: Stripe integration is not yet complete — this endpoint is DEMO ONLY.
//   In production, verify Stripe payment BEFORE calling this endpoint.
//   The STRIPE_SECRET_KEY env var acts as a gate: if unset in prod, unlocks are blocked.
export const POST: APIRoute = async ({ request, locals }) => {
  // Block in production until Stripe is wired up (prevents free unlocks)
  if (import.meta.env.PROD && !import.meta.env.STRIPE_SECRET_KEY) {
    return new Response(JSON.stringify({ error: '付費功能尚未開放' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userId = locals.auth?.()?.userId ?? null;
  if (!userId) return new Response('Unauthorized', { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch { return new Response('Bad request', { status: 400 }); }

  const { slug } = body as Record<string, unknown>;
  if (typeof slug !== 'string' || !SLUG_RE.test(slug))
    return new Response('Bad request', { status: 400 });

  // Verify story exists and is actually paid-level (prevents unlocking non-paid or fake slugs)
  const entry = await getEntry('stories', slug);
  if (!entry || entry.data.level !== 'paid') {
    return new Response('Not found', { status: 404 });
  }

  const { error } = await supabase
    .from('user_unlocks')
    .upsert({ user_id: userId, story_slug: slug }, { onConflict: 'user_id,story_slug', ignoreDuplicates: true });

  if (error) return new Response(JSON.stringify({ error: '解鎖失敗，請稍後再試' }), { status: 500 });
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
