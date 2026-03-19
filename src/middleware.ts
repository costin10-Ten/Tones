import { clerkMiddleware } from '@clerk/astro/server';

export const onRequest = clerkMiddleware((auth, context) => {
  const url = new URL(context.request.url);
  const pathname = url.pathname;

  // Let Keystatic handle its own routes — don't let Clerk interfere
  if (pathname.startsWith('/keystatic') || pathname.startsWith('/api/keystatic')) {
    return;
  }

  const { userId } = auth();

  // Protect /member — must be logged in
  if (pathname.startsWith('/member') && !userId) {
    return context.redirect('/sign-in?redirect_url=' + encodeURIComponent(pathname));
  }

  // Redirect already-authenticated users away from auth pages
  if (userId && (pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up'))) {
    return context.redirect('/');
  }

  // Individual story access control is handled inside [slug].astro
  // (checks level: public / restricted / top-secret / paid)
});
