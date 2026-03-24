import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';
import { createRateLimiter } from '../../lib/rate-limit';

export const prerender = false;

const MAX_LEN = 2000;

// Per-IP rate limit: max 3 contact submissions per 10 minutes
const { isLimited: isRateLimited } = createRateLimiter(3, 10 * 60_000);

export const POST: APIRoute = async ({ request, locals }) => {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (isRateLimited(ip))
    return new Response(JSON.stringify({ error: '操作過於頻繁，請稍後再試' }), { status: 429 });

  let body: unknown;
  try { body = await request.json(); } catch { return new Response('Bad request', { status: 400 }); }

  const { message } = body as Record<string, unknown>;
  if (typeof message !== 'string' || !message.trim()) return new Response('Bad request', { status: 400 });
  if (message.length > MAX_LEN) return new Response('Message too long', { status: 400 });

  const userId = locals.auth?.()?.userId ?? null;

  const { error } = await supabase
    .from('contact_messages')
    .insert({ user_id: userId, message: message.trim() });

  if (error) return new Response(JSON.stringify({ error: '操作失敗，請稍後再試' }), { status: 500 });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
