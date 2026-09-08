import type { NextFunction, Request, Response } from 'express';

// Local/demo data is served from an in-memory CSV parse, so real responses return in single-digit
// milliseconds -- too fast for the frontend's loading states (skeletons, spinners) to ever be
// visible. This adds a fixed artificial delay to every API response so those states show up the
// way they would against a real, network-latency-bound backend. Override with
// SIMULATE_LATENCY_MS=0 to disable (e.g. in CI/tests where the delay would just slow things down).
const SIMULATE_LATENCY_MS = Number(process.env.SIMULATE_LATENCY_MS ?? 1000);

export function simulateLatency(_req: Request, _res: Response, next: NextFunction): void {
  if (SIMULATE_LATENCY_MS <= 0) {
    next();
    return;
  }
  setTimeout(next, SIMULATE_LATENCY_MS);
}
