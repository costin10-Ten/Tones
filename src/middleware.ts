import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server';

const isProtectedRoute = createRouteMatcher(['/stories/:path*']);

export const onRequest = clerkMiddleware((auth, context) => {
  const { userId } = auth();

  if (isProtectedRoute(context.request)) {
    const url = new URL(context.request.url);
    const slug = url.pathname.replace('/stories/', '');

    // Public stories don't need auth
    const publicSlugs = ['file-045'];
    if (publicSlugs.includes(slug)) return;

    if (!userId) {
      return context.redirect('/sign-in?redirect=' + encodeURIComponent(url.pathname));
    }
  }
});
