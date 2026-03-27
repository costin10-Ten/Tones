import { sequence, defineMiddleware } from 'astro:middleware';
import { clerkMiddleware } from '@clerk/astro/server';

// ─── CSP middleware ──────────────────────────────────────────────────────────
// NOTE: nonce-based script-src is intentionally NOT used here.
// Astro's ViewTransitions fetches each page as a background request and swaps
// the DOM client-side; the browser keeps the ORIGINAL page's CSP in effect for
// the entire session. A per-request random nonce would therefore block all
// inline scripts (define:vars, is:inline) after the first navigation, breaking
// auth state, coins, the back button, and everything else. 'unsafe-inline' is
// required for ViewTransitions compatibility.
const nonceMW = defineMiddleware(async (context, next) => {
  const pathname = new URL(context.request.url).pathname;

  // Skip CSP for Keystatic — it manages its own scripts/styles/connections
  if (pathname.startsWith('/keystatic') || pathname.startsWith('/api/keystatic')) {
    return next();
  }

  const response = await next();

  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://clerk.tones-pi.vercel.app https://*.clerk.accounts.dev",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://*.supabase.co https://clerk.tones-pi.vercel.app https://*.clerk.accounts.dev wss://*.supabase.co",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
  response.headers.set('Content-Security-Policy', csp);

  return response;
});

// ─── Clerk auth middleware ───────────────────────────────────────────────────
const clerkMW = clerkMiddleware((auth, context) => {
  const url = new URL(context.request.url);
  const pathname = url.pathname;

  // Let Keystatic handle its own routes — don't let Clerk interfere
  if (pathname.startsWith('/keystatic') || pathname.startsWith('/api/keystatic')) {
    return;
  }

  const { userId } = auth();

  // Protect /member and /admin — must be logged in
  if ((pathname.startsWith('/member') || pathname.startsWith('/admin')) && !userId) {
    return context.redirect('/sign-in?redirect_url=' + encodeURIComponent(pathname));
  }

  // Redirect already-authenticated users away from auth pages
  if (userId && (pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up'))) {
    return context.redirect('/');
  }

  // Individual story access control is handled inside [slug].astro
  // (checks level: public / restricted / top-secret / paid)
});

export const onRequest = sequence(nonceMW, clerkMW);
