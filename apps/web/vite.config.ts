import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Unit tests run under Jest (jest.config.cjs), matching the assessment brief's stated stack.
// This file only configures the dev server and production build.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
