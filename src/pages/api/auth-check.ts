import type { APIRoute } from 'astro';

export const prerender = false;

// Lightweight endpoint: returns whether the current request is authenticated.
// Used by client-side JS on edge-cached public story pages to decide whether
// to show the comment form or the login prompt.
export const GET: APIRoute = async ({ locals }) => {
  const userId = locals.auth?.()?.userId ?? null;
  return new Response(JSON.stringify({ authed: !!userId }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, private',
    },
  });
};
