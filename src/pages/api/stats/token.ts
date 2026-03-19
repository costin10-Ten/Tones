import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const prerender = false;

const VALID_ACTIONS = new Set(['add', 'remove']);
const SLUG_RE = /^[a-z0-9-]+$/;

export const POST: APIRoute = async ({ request, locals }) => {
  let body: unknown;
  try { body = await request.json(); } catch { return new Response('Bad request', { status: 400 }); }

  const { slug, action } = body as Record<string, unknown>;
  if (typeof slug !== 'string' || !SLUG_RE.test(slug)) return new Response('Bad request', { status: 400 });
  if (!VALID_ACTIONS.has(action as string)) return new Response('Bad request', { status: 400 });

  const userId = locals.auth?.()?.userId ?? null;

  if (userId) {
    // Logged-in: track in user_tokens + update global count
    if (action === 'add') {
      const { error: insertErr } = await supabase
        .from('user_tokens')
        .insert({ user_id: userId, story_slug: slug });

      if (insertErr && insertErr.code !== '23505') {
        return new Response(JSON.stringify({ error: insertErr.message }), { status: 500 });
      }
      if (!insertErr) {
        const { error: rpcErr } = await supabase.rpc('increment_token', { p_slug: slug });
        if (rpcErr) return new Response(JSON.stringify({ error: rpcErr.message }), { status: 500 });
      }
    } else {
      const { error: delErr } = await supabase
        .from('user_tokens')
        .delete()
        .eq('user_id', userId)
        .eq('story_slug', slug);

      if (delErr) return new Response(JSON.stringify({ error: delErr.message }), { status: 500 });

      const { error: rpcErr } = await supabase.rpc('decrement_token', { p_slug: slug });
      if (rpcErr) return new Response(JSON.stringify({ error: rpcErr.message }), { status: 500 });
    }
  } else {
    // Anonymous: update global count only (localStorage prevents duplicate clicks client-side)
    const rpc = action === 'add' ? 'increment_token' : 'decrement_token';
    const { error: rpcErr } = await supabase.rpc(rpc, { p_slug: slug });
    if (rpcErr) return new Response(JSON.stringify({ error: rpcErr.message }), { status: 500 });
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
