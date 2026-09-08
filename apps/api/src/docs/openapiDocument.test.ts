import { reconciliationRouter } from '../routes/reconciliation';
import { openApiDocument } from './openapiDocument';

interface ExpressRouteLayer {
  route?: { path: string; methods: Record<string, boolean> };
}

/**
 * The one guarantee `docs/backlog/` EPIC-14 (US-14.3) asks for: the spec can't silently drift
 * from the real route table, because this test derives the "actual" side directly from the
 * Express router Express itself uses to serve requests -- not from a second hand-maintained list.
 * `router.stack` is undocumented Express internals, not a public type, so it's read via a
 * minimal structural interface rather than pulling in Express's internal types.
 */
function actualRoutes(): { method: string; path: string }[] {
  const stack = (reconciliationRouter as unknown as { stack: ExpressRouteLayer[] }).stack;
  const routes: { method: string; path: string }[] = [];

  for (const layer of stack) {
    const route = layer.route;
    if (!route) continue;
    for (const method of Object.keys(route.methods)) {
      // Express path params (":id") -> OpenAPI path params ("{id}").
      const openApiPath = route.path.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
      routes.push({ method, path: openApiPath });
    }
  }
  return routes;
}

describe('openApiDocument', () => {
  it('documents every route the router actually registers, and nothing extra', () => {
    const documented = Object.entries(openApiDocument.paths).flatMap(([path, methods]) =>
      Object.keys(methods).map((method) => ({ method, path })),
    );

    const actual = actualRoutes();

    const documentedSet = new Set(documented.map((r) => `${r.method} ${r.path}`));
    const actualSet = new Set(actual.map((r) => `${r.method} ${r.path}`));

    expect(documentedSet).toEqual(actualSet);
  });

  it('is a well-formed OpenAPI 3.0 document with a title and version', () => {
    expect(openApiDocument.openapi).toBe('3.0.3');
    expect(openApiDocument.info.title).toBeTruthy();
    expect(openApiDocument.info.version).toBeTruthy();
  });
});
