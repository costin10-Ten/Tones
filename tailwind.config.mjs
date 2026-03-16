/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        bg2: 'var(--bg2)',
        surface: 'var(--surface)',
        border: 'var(--border)',
        accent: 'var(--accent)',
        'accent2': 'var(--accent2)',
        'accent-dim': 'var(--accent-dim)',
        text: 'var(--text)',
        'text-dim': 'var(--text-dim)',
        'text-muted': 'var(--text-muted)',
        danger: 'var(--danger)',
        warm: 'var(--warm)',
      },
      fontFamily: {
        serif: ["'Noto Serif TC'", 'serif'],
        sans: ["'Noto Sans TC'", 'sans-serif'],
        mono: ["'Share Tech Mono'", 'monospace'],
      },
    },
  },
  plugins: [],
};
