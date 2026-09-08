import express from 'express';
import request from 'supertest';

import { requireBasicAuth } from './basicAuth';

function buildApp(username: string, password: string) {
  const app = express();
  app.get('/protected', requireBasicAuth(username, password), (_req, res) => {
    res.status(200).json({ ok: true });
  });
  return app;
}

function basicAuthHeader(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

describe('requireBasicAuth', () => {
  const app = buildApp('admin', 'admin123');

  it('returns 401 with a WWW-Authenticate challenge when no credentials are supplied', async () => {
    const res = await request(app).get('/protected');

    expect(res.status).toBe(401);
    expect(res.headers['www-authenticate']).toMatch(/^Basic realm=/);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 when the credentials are wrong', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', basicAuthHeader('admin', 'wrong'));

    expect(res.status).toBe(401);
  });

  it('returns 401 for a malformed Authorization header', async () => {
    const res = await request(app).get('/protected').set('Authorization', 'Bearer not-basic-auth');

    expect(res.status).toBe(401);
  });

  it('allows the request through with correct credentials', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', basicAuthHeader('admin', 'admin123'));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
