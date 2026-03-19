import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const prerender = false;

const MAX_LEN = 2000;

export const POST: APIRoute = async ({ request, locals }) => {
  let body: unknown;
  try { body = await request.json(); } catch { return new Response('Bad request', { status: 400 }); }

  const { message } = body as Record<string, unknown>;
  if (typeof message !== 'string' || !message.trim()) return new Response('Bad request', { status: 400 });
  if (message.length > MAX_LEN) return new Response('Message too long', { status: 400 });

  const userId = locals.auth?.()?.userId ?? null;

  const { error } = await supabase
    .from('contact_messages')
    .insert({ user_id: userId, message: message.trim() });

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
