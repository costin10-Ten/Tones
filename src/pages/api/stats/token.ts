import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const { slug, action } = await request.json(); // action: 'add' | 'remove'
  if (!slug || !action) return new Response('Bad request', { status: 400 });

  const userId = locals.auth?.()?.userId ?? null;
  if (!userId) return new Response('Unauthorized', { status: 401 });

  if (action === 'add') {
    // Insert user token record (ignore if already exists)
    const { error: insertErr } = await supabase
      .from('user_tokens')
      .insert({ user_id: userId, story_slug: slug })
      .select();

    if (insertErr && insertErr.code !== '23505') { // 23505 = unique violation (already liked)
      return new Response(JSON.stringify({ error: insertErr.message }), { status: 500 });
    }

    // Increment global token count
    if (!insertErr) {
      await supabase.rpc('increment_token', { p_slug: slug });
    }
  } else {
    // Remove user token record
    const { error: delErr } = await supabase
      .from('user_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('story_slug', slug);

    if (delErr) return new Response(JSON.stringify({ error: delErr.message }), { status: 500 });

    // Decrement global token count
    await supabase.rpc('decrement_token', { p_slug: slug });
  }

  // Return updated token count
  const { data } = await supabase
    .from('story_stats')
    .select('tokens')
    .eq('story_slug', slug)
    .single();

  return new Response(JSON.stringify({ tokens: data?.tokens ?? 0 }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
