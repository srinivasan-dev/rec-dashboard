// Must run before anything else reads process.env (createApp and everything it wires up,
// including the Claude providers' CLAUDE_API_KEY lookup) -- loads apps/api/.env if present, a
// no-op in any environment (e.g. CI, a real deployment) where env vars are already set another
// way.
import 'dotenv/config';

import { createApp } from './app';

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

const app = createApp();

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[api] listening on http://localhost:${PORT}`);
});
