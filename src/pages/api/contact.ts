import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const prerender = false;

const MAX_LEN = 2000;

// Per-IP rate limit: max 3 contact submissions per 10 minutes
const CONTACT_LIMIT = 3;
const CONTACT_WINDOW_MS = 10 * 60_000;
const contactTimestamps = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - CONTACT_WINDOW_MS;
  const times = (contactTimestamps.get(ip) ?? []).filter(t => t > cutoff);
  if (times.length >= CONTACT_LIMIT) return true;
  times.push(now);
  contactTimestamps.set(ip, times);
  if (contactTimestamps.size > 500) {
    for (const [k, ts] of contactTimestamps) {
      if (!ts.some(t => t > cutoff)) contactTimestamps.delete(k);
    }
  }
  return false;
}

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
