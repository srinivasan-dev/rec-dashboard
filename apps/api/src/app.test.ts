import request from 'supertest';

import { createApp } from './app';

describe('app', () => {
  it('responds to GET /api/health with 200 ok', async () => {
    const res = await request(createApp()).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  describe('GET /api/docs (Swagger UI)', () => {
    it('returns 401 without credentials', async () => {
      const res = await request(createApp()).get('/api/docs/');

      expect(res.status).toBe(401);
      expect(res.headers['www-authenticate']).toMatch(/^Basic realm=/);
    });

    it('returns 401 with wrong credentials', async () => {
      const wrongCreds = Buffer.from('admin:wrong-password').toString('base64');
      const res = await request(createApp())
        .get('/api/docs/')
        .set('Authorization', `Basic ${wrongCreds}`);

      expect(res.status).toBe(401);
    });

    it('serves the Swagger UI with the default dev credentials', async () => {
      const validCreds = Buffer.from('admin:admin123').toString('base64');
      const res = await request(createApp())
        .get('/api/docs/')
        .set('Authorization', `Basic ${validCreds}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/html/);
    });
  });
});
