/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  // The generated atlas data (~1.5 MB JSON) is bundled on purpose; the app is a static single page.
  build: { chunkSizeWarningLimit: 2500 },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
