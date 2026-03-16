import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import clerk from '@clerk/astro';
import keystatic from '@keystatic/astro';

export default defineConfig({
  output: 'hybrid',
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
