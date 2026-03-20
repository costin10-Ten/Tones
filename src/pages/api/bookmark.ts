import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const prerender = false;

const SLUG_RE = /^[a-z0-9-]+$/;
const VALID_ACTIONS = new Set(['add', 'remove']);

export const GET: APIRoute = async ({ locals }) => {
  const userId = locals.auth?.()?.userId ?? null;
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const { data } = await supabase
    .from('bookmarks')
    .select('story_slug, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return new Response(JSON.stringify(data ?? []), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const userId = locals.auth?.()?.userId ?? null;
  if (!userId) return new Response('Unauthorized', { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch { return new Response('Bad request', { status: 400 }); }

  const { slug, action } = body as Record<string, unknown>;
  if (typeof slug !== 'string' || !SLUG_RE.test(slug)) return new Response('Bad request', { status: 400 });
  if (!VALID_ACTIONS.has(action as string)) return new Response('Bad request', { status: 400 });

  if (action === 'add') {
    const { error } = await supabase
      .from('bookmarks')
      .upsert({ user_id: userId, story_slug: slug }, { onConflict: 'user_id,story_slug', ignoreDuplicates: true });
    if (error) return new Response(JSON.stringify({ error: '操作失敗，請稍後再試' }), { status: 500 });
  } else {
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('user_id', userId)
      .eq('story_slug', slug);
    if (error) return new Response(JSON.stringify({ error: '操作失敗，請稍後再試' }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
