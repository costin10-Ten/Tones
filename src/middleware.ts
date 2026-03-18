import { clerkMiddleware } from '@clerk/astro/server';

export const onRequest = clerkMiddleware((auth, context) => {
  const url = new URL(context.request.url);
  const pathname = url.pathname;

  // Let Keystatic handle its own routes — don't let Clerk interfere
  if (pathname.startsWith('/keystatic') || pathname.startsWith('/api/keystatic')) {
    return;
  }

  // Protect /member — must be logged in
  const { userId } = auth();
  if (pathname.startsWith('/member') && !userId) {
    return context.redirect('/sign-in?redirect_url=' + encodeURIComponent(pathname));
  }

  // Individual story access control is handled inside [slug].astro
  // (checks level: public / restricted / top-secret / paid)
});
