import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const prerender = false;

const SLUG_RE = /^[a-z0-9-]+$/;

// POST /api/unlock  body: { slug }  — auth required
// Records a paid story unlock for the current user.
// TODO: Before recording, verify payment via Stripe webhook or Checkout session.
export const POST: APIRoute = async ({ request, locals }) => {
  const userId = locals.auth?.()?.userId ?? null;
  if (!userId) return new Response('Unauthorized', { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch { return new Response('Bad request', { status: 400 }); }

  const { slug } = body as Record<string, unknown>;
  if (typeof slug !== 'string' || !SLUG_RE.test(slug))
    return new Response('Bad request', { status: 400 });

  const { error } = await supabase
    .from('user_unlocks')
    .upsert({ user_id: userId, story_slug: slug }, { onConflict: 'user_id,story_slug', ignoreDuplicates: true });

  if (error) return new Response(JSON.stringify({ error: '解鎖失敗，請稍後再試' }), { status: 500 });
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
