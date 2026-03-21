import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { randomBytes } from 'crypto';

export const prerender = false;

// ─── GET: 取得使用者所有清單 ──────────────────────────────
export const GET: APIRoute = async ({ locals }) => {
  const userId = locals.auth?.()?.userId ?? null;
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const { data, error } = await supabase
    .from('reading_lists')
    .select('id, name, slugs, is_public, share_token, created_at, updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  return new Response(JSON.stringify(data ?? []), {
    headers: { 'Content-Type': 'application/json' },
  });
};

// ─── POST: 建立新清單 ─────────────────────────────────────
export const POST: APIRoute = async ({ locals, request }) => {
  const userId = locals.auth?.()?.userId ?? null;
  if (!userId) return new Response('Unauthorized', { status: 401 });

  let body: { name?: string; slugs?: string[] };
  try { body = await request.json(); } catch (_) { body = {}; }

  const name = (body.name ?? '').trim().slice(0, 60);
  if (!name) return new Response(JSON.stringify({ error: '清單名稱不能為空' }), { status: 400 });

  const slugs = Array.isArray(body.slugs) ? body.slugs : [];

  const { data, error } = await supabase
    .from('reading_lists')
    .insert({ user_id: userId, name, slugs })
    .select('id, name, slugs, is_public, share_token, created_at, updated_at')
    .single();

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  return new Response(JSON.stringify(data), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
