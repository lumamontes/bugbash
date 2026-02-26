// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from "@tailwindcss/vite";
import react from '@astrojs/react';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [react()],
  security: {
    checkOrigin: false,
  },
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      external: ['pg', 'pg-native', '@supabase/supabase-js', '@anthropic-ai/sdk', '@linear/sdk'],
    },
  },
});
