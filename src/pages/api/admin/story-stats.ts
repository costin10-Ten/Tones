import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  const userId = locals.auth?.()?.userId ?? null;
  if (!userId) return new Response('Unauthorized', { status: 401 });
  const adminId = import.meta.env.ADMIN_USER_ID ?? '';
  if (!adminId || userId !== adminId) return new Response('Forbidden', { status: 403 });

  const { data, error } = await supabase
    .from('story_stats')
    .select('story_slug, views, tokens, updated_at')
    .order('views', { ascending: false });

  if (error) return new Response(JSON.stringify({ error: '查詢失敗，請稍後再試' }), { status: 500 });
  return new Response(JSON.stringify(data ?? []), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
};
