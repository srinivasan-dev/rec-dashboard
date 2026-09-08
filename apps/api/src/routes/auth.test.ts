import request from 'supertest';

import { createApp } from '../app';

const DEMO_USERNAME = process.env.DEMO_LOGIN_USERNAME ?? 'm104@rapyd.com';
const DEMO_PASSWORD = process.env.DEMO_LOGIN_PASSWORD ?? 'm104@123';

describe('POST /api/auth/login', () => {
  it('logs in with the correct demo credentials and sets a session cookie', async () => {
    const res = await request(createApp())
      .post('/api/auth/login')
      .send({ username: DEMO_USERNAME, password: DEMO_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ merchantId: 'M-104' });
    expect(res.headers['set-cookie']?.[0]).toMatch(/rapyd_session=.+; .*HttpOnly/);
  });

  it('rejects a wrong password with 401, without revealing which field was wrong', async () => {
    const res = await request(createApp())
      .post('/api/auth/login')
      .send({ username: DEMO_USERNAME, password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejects an unknown username with the identical 401 shape as a wrong password', async () => {
    const res = await request(createApp())
      .post('/api/auth/login')
      .send({ username: 'not-a-real-user', password: 'anything' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejects a missing password with 400', async () => {
    const res = await request(createApp())
      .post('/api/auth/login')
      .send({ username: DEMO_USERNAME });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/auth/session', () => {
  it('returns 401 with no session cookie', async () => {
    const res = await request(createApp()).get('/api/auth/session');

    expect(res.status).toBe(401);
  });

  it('returns the merchantId for a valid session', async () => {
    const agent = request.agent(createApp());
    await agent.post('/api/auth/login').send({ username: DEMO_USERNAME, password: DEMO_PASSWORD });

    const res = await agent.get('/api/auth/session');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ merchantId: 'M-104' });
  });
});

describe('POST /api/auth/logout', () => {
  it('clears the session so a subsequent reconciliation request is rejected', async () => {
    const app = createApp();
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ username: DEMO_USERNAME, password: DEMO_PASSWORD });

    const beforeLogout = await agent.get('/api/reconciliation/summary');
    expect(beforeLogout.status).toBe(200);

    const logoutRes = await agent.post('/api/auth/logout');
    expect(logoutRes.status).toBe(200);

    const afterLogout = await agent.get('/api/reconciliation/summary');
    expect(afterLogout.status).toBe(401);
  });
});
