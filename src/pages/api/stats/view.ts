import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const prerender = false;

const SLUG_RE = /^[a-z0-9-]+$/;

export const POST: APIRoute = async ({ request }) => {
  let body: unknown;
  try { body = await request.json(); } catch { return new Response('Bad request', { status: 400 }); }
  const { slug } = body as Record<string, unknown>;
  if (typeof slug !== 'string' || !SLUG_RE.test(slug)) return new Response('Bad request', { status: 400 });

  const { error } = await supabase.rpc('increment_view', { p_slug: slug });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
