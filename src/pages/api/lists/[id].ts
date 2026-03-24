import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { randomBytes } from 'crypto';

export const prerender = false;

// ─── PUT: 更新清單 ────────────────────────────────────────
// Body fields (all optional):
//   name: string         — rename
//   slugs: string[]      — replace full slug list
//   add: string[]        — append slugs
//   remove: string[]     — remove slugs
//   is_public: boolean   — toggle sharing
export const PUT: APIRoute = async ({ locals, request, params }) => {
  const userId = locals.auth?.()?.userId ?? null;
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const { id } = params;
  if (!id) return new Response('Missing id', { status: 400 });

  // Verify ownership
  const { data: existing, error: fetchErr } = await supabase
    .from('reading_lists')
    .select('id, slugs, is_public, share_token')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (fetchErr || !existing) return new Response('Not found', { status: 404 });

  let body: {
    name?: string;
    slugs?: string[];
    add?: string[];
    remove?: string[];
    is_public?: boolean;
  };
  try { body = await request.json(); } catch (_) { body = {}; }

  const SLUG_RE = /^[a-z0-9-]+$/;

  // Validate name early so we can bail out before building patch
  if (typeof body.name === 'string') {
    const trimmed = body.name.trim().slice(0, 60);
    if (!trimmed) return new Response(JSON.stringify({ error: '清單名稱不能為空' }), { status: 400 });
  }

  // Slug mutations
  let slugs: string[] = existing.slugs ?? [];
  if (Array.isArray(body.slugs)) {
    slugs = body.slugs.filter((s): s is string => typeof s === 'string' && SLUG_RE.test(s));
  } else {
    if (Array.isArray(body.add)) {
      const toAdd = body.add.filter((s): s is string => typeof s === 'string' && SLUG_RE.test(s) && !slugs.includes(s));
      slugs = [...slugs, ...toAdd];
    }
    if (Array.isArray(body.remove)) {
      const removeSet = new Set(body.remove.filter((s): s is string => typeof s === 'string' && SLUG_RE.test(s)));
      slugs = slugs.filter(s => !removeSet.has(s));
    }
  }

  // Share token logic
  const shareTokenPatch =
    typeof body.is_public === 'boolean'
      ? body.is_public && !existing.share_token
        ? { share_token: randomBytes(6).toString('base64url') }
        : !body.is_public
          ? { share_token: null }
          : {}
      : {};

  const patch = {
    updated_at: new Date().toISOString(),
    slugs,
    ...(typeof body.name === 'string' && { name: body.name.trim().slice(0, 60) }),
    ...(typeof body.is_public === 'boolean' && { is_public: body.is_public }),
    ...shareTokenPatch,
  };

  const { data, error } = await supabase
    .from('reading_lists')
    .update(patch)
    .eq('id', id)
    .select('id, name, slugs, is_public, share_token, updated_at')
    .single();

  if (error) return new Response(JSON.stringify({ error: '更新失敗，請稍後再試' }), { status: 500 });

  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });
};

// ─── DELETE: 刪除清單 ─────────────────────────────────────
export const DELETE: APIRoute = async ({ locals, params }) => {
  const userId = locals.auth?.()?.userId ?? null;
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const { id } = params;
  if (!id) return new Response('Missing id', { status: 400 });

  const { error } = await supabase
    .from('reading_lists')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) return new Response(JSON.stringify({ error: '刪除失敗，請稍後再試' }), { status: 500 });

  return new Response(null, { status: 204 });
};
