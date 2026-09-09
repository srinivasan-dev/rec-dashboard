import { fileURLToPath, URL } from 'node:url';

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
  // @rapyd-portal/shared is a workspace-linked CommonJS package (packages/shared/dist/index.js,
  // built for apps/api's Node/CJS `require`). Vite's dev server serves it via its own lightweight
  // CJS->ESM interop, which can miss named exports (parseAmountToMinorUnits/
  // formatMinorUnitsAsDecimal) once a new one comes into use (FinancialImpactBarChart.tsx) --
  // `optimizeDeps.include` forces those through esbuild's more robust interop instead, fixing
  // `vite dev`. But `optimizeDeps` has no effect on `vite build`, which runs the compiled dist
  // through Rollup's bundled commonjs handling instead -- its static export-detection missed the
  // same export, so `npm run build` failed outright even though `tsc --noEmit` (which resolves
  // this package via its TS source, not the built dist) and `vite dev` both looked clean. Caught
  // during the 2026-09-09 overnight baseline run: the first time this repo's production build had
  // actually been exercised since these chart widgets were added (every prior verification in
  // this repo's history was `tsc --noEmit` + a live dev server, never `npm run build`). Aliasing
  // the package specifier straight to its TypeScript source sidesteps the CJS/ESM interop
  // entirely for the web build -- Vite/esbuild compiles it like any other source file it
  // processes, the same as apps/web's own `.ts` files, so there's no compiled-CJS boundary left
  // for either environment (dev or build) to misread.
  resolve: {
    alias: {
      '@rapyd-portal/shared': fileURLToPath(
        new URL('../../packages/shared/src/index.ts', import.meta.url),
      ),
    },
  },
});
