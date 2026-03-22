import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import clerk from '@clerk/astro';
import keystatic from '@keystatic/astro';
import vercel from '@astrojs/vercel/serverless';

export default defineConfig({
  site: 'https://tones-pi.vercel.app',
  output: 'hybrid',
  adapter: vercel({
    headers: [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ],
  }),
  integrations: [
    tailwind({ applyBaseStyles: false }),
    react(),
    clerk(),
    keystatic(),
  ],
  vite: {
    optimizeDeps: {
      exclude: ['@keystatic/core'],
    },
  },
});
