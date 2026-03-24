import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';
import { createRateLimiter } from '../../lib/rate-limit';

export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LEN = 254; // RFC 5321

// Per-IP rate limit: max 3 subscriptions per 10 minutes
const { isLimited: isRateLimited } = createRateLimiter(3, 10 * 60_000);

export const POST: APIRoute = async ({ request }) => {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (isRateLimited(ip))
    return new Response(JSON.stringify({ error: '操作過於頻繁，請稍後再試' }), { status: 429 });

  let body: unknown;
  try { body = await request.json(); } catch { return new Response('Bad request', { status: 400 }); }

  const { email } = body as Record<string, unknown>;
  if (typeof email !== 'string' || email.length > MAX_EMAIL_LEN || !EMAIL_RE.test(email))
    return new Response(JSON.stringify({ error: '請輸入有效的電子郵件' }), { status: 400 });

  const { error } = await supabase
    .from('email_subscribers')
    .upsert({ email: email.toLowerCase().trim() }, { onConflict: 'email', ignoreDuplicates: true });

  if (error) return new Response(JSON.stringify({ error: '訂閱失敗，請稍後再試' }), { status: 500 });
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
