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
  // @rapyd-portal/shared is a workspace-linked CommonJS package (packages/shared/dist/index.js).
  // Vite serves linked packages straight from disk via its own lightweight CJS->ESM interop
  // instead of pre-bundling them through esbuild, and that interop can fail to pick up every
  // named export (parseAmountToMinorUnits/formatMinorUnitsAsDecimal) once real runtime imports
  // of them showed up (FinancialImpactBarChart.tsx). Forcing it through esbuild's own, more
  // robust CJS->ESM conversion via optimizeDeps.include fixes the missing-export error.
  optimizeDeps: {
    include: ['@rapyd-portal/shared'],
  },
});
