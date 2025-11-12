// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],

    site: 'http://www2/~r123304/',
    base: '/~r123304/',

  vite: {
    plugins: [tailwindcss()],
  },
});