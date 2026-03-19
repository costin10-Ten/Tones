import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const POST: APIRoute = async ({ request }) => {
  let body: unknown;
  try { body = await request.json(); } catch { return new Response('Bad request', { status: 400 }); }

  const { email } = body as Record<string, unknown>;
  if (typeof email !== 'string' || !EMAIL_RE.test(email))
    return new Response(JSON.stringify({ error: '請輸入有效的電子郵件' }), { status: 400 });

  const { error } = await supabase
    .from('email_subscribers')
    .upsert({ email: email.toLowerCase().trim() }, { onConflict: 'email', ignoreDuplicates: true });

  if (error) return new Response(JSON.stringify({ error: '訂閱失敗，請稍後再試' }), { status: 500 });
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
