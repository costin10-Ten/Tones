import type { APIRoute } from 'astro';
import { supabase } from '../../../../lib/supabase';

export const prerender = false;

// ─── GET: 公開讀取分享清單（無需登入）──────────────────────
export const GET: APIRoute = async ({ params }) => {
  const { token } = params;
  if (!token) return new Response('Not found', { status: 404 });

  const { data, error } = await supabase
    .from('reading_lists')
    .select('id, name, slugs, created_at')
    .eq('share_token', token)
    .eq('is_public', true)
    .single();

  if (error || !data) return new Response('Not found', { status: 404 });

  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
    },
  });
};
