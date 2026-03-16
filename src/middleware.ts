import { clerkMiddleware } from '@clerk/astro/server';

const isMemberRoute = (pathname: string) => pathname.startsWith('/member');

export const onRequest = clerkMiddleware((auth, context) => {
  const { userId } = auth();
  const url = new URL(context.request.url);
  const pathname = url.pathname;

  // Protect /member — must be logged in
  if (isMemberRoute(pathname) && !userId) {
    return context.redirect('/sign-in?redirect_url=' + encodeURIComponent(pathname));
  }

  // Individual story access control is handled inside [slug].astro
  // (checks level: public / restricted / top-secret / paid)
});
