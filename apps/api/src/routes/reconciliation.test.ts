import request from 'supertest';

import { createApp } from '../app';

// These tests exercise the real M-104 dataset in data/ (the sample merchant, per README.md),
// not synthetic fixtures -- the exact figures below were independently verified in Phase 3
// (see docs/sessions/) by running the reconciliation engine directly against the same CSVs.
//
// Since EPIC-15, every /api/reconciliation/* request requires a real session -- these tests log
// in as the demo M-104 account once and reuse the resulting session cookie (a supertest `agent`
// persists cookies across requests, the same way a browser would) rather than hitting the
// endpoints unauthenticated the way they did before a real login existed.
const app = createApp();
const agent = request.agent(app);

beforeAll(async () => {
  await agent.post('/api/auth/login').send({
    username: process.env.DEMO_LOGIN_USERNAME ?? 'm104@rapyd.com',
    password: process.env.DEMO_LOGIN_PASSWORD ?? 'm104@123',
  });
});

describe('unauthenticated access', () => {
  it('rejects every reconciliation endpoint with 401 when there is no session at all', async () => {
    const anonymous = request(app);

    const summary = await anonymous.get('/api/reconciliation/summary');
    const list = await anonymous.get('/api/reconciliation/exceptions');
    const byId = await anonymous.get('/api/reconciliation/exceptions/T1013');
    const exported = await anonymous.get('/api/reconciliation/exceptions/export');
    const explanation = await anonymous.post('/api/reconciliation/exceptions/T1013/explanation');

    for (const res of [summary, list, byId, exported, explanation]) {
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    }
  });
});

describe('GET /api/reconciliation/summary', () => {
  it("returns M-104's summary with financial impact grouped by currency", async () => {
    const res = await agent.get('/api/reconciliation/summary');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      merchantId: 'M-104',
      totalChecked: 14,
      matchedCount: 9,
      exceptionCount: 5,
    });
    expect(res.body.data.financialImpactByCurrency).toEqual(
      expect.arrayContaining([
        { currency: 'AED', amount: '1533.31' },
        { currency: 'USD', amount: '24.31' },
      ]),
    );
  });
});

describe('GET /api/reconciliation/exceptions', () => {
  it('returns all 5 exceptions with default pagination', async () => {
    const res = await agent.get('/api/reconciliation/exceptions');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(5);
    expect(res.body.pagination).toEqual({ page: 1, pageSize: 20, total: 5, totalPages: 1 });
  });

  it('filters by reason', async () => {
    const res = await agent
      .get('/api/reconciliation/exceptions')
      .query({ reason: 'AMOUNT_MISMATCH' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ transactionId: 'T1013', reason: 'AMOUNT_MISMATCH' });
  });

  it('paginates results', async () => {
    const res = await agent.get('/api/reconciliation/exceptions').query({ page: 2, pageSize: 2 });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination).toEqual({ page: 2, pageSize: 2, total: 5, totalPages: 3 });
  });

  it('sorts by transactionId descending', async () => {
    const res = await agent
      .get('/api/reconciliation/exceptions')
      .query({ sortBy: 'transactionId', sortOrder: 'desc' });

    const ids = res.body.data.map((e: { transactionId: string }) => e.transactionId);
    expect(ids).toEqual([...ids].sort().reverse());
  });

  it('rejects an unknown reason with 400', async () => {
    const res = await agent
      .get('/api/reconciliation/exceptions')
      .query({ reason: 'NOT_A_REAL_REASON' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a pageSize above the max with 400', async () => {
    const res = await agent.get('/api/reconciliation/exceptions').query({ pageSize: 500 });

    expect(res.status).toBe(400);
  });

  it('rejects a "from" date after "to" with 400', async () => {
    const res = await agent
      .get('/api/reconciliation/exceptions')
      .query({ from: '2026-08-01', to: '2026-01-01' });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/reconciliation/exceptions/:id', () => {
  it('returns exception detail for a known M-104 exception', async () => {
    const res = await agent.get('/api/reconciliation/exceptions/T1013');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      transactionId: 'T1013',
      reason: 'AMOUNT_MISMATCH',
      differenceAmount: '24.31',
    });
  });

  it('returns 404 for a transaction id that does not exist at all', async () => {
    const res = await agent.get('/api/reconciliation/exceptions/DOES-NOT-EXIST');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 for a real exception that belongs to a different merchant (merchant isolation)', async () => {
    // T1031 is a genuine DUPLICATE_LEDGER exception, but for M-106 -- the mocked session is
    // always M-104, so this must 404 rather than leak M-106's data.
    const res = await agent.get('/api/reconciliation/exceptions/T1031');

    expect(res.status).toBe(404);
  });
});

describe('GET /api/reconciliation/exceptions/export', () => {
  it('returns a CSV of only M-104 exceptions', async () => {
    const res = await agent.get('/api/reconciliation/exceptions/export');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    const lines = res.text.trim().split('\n');
    expect(lines).toHaveLength(6); // header + 5 exceptions
    expect(res.text).toContain('T1013');
    expect(res.text).not.toContain('T1031'); // belongs to M-106, must never appear
  });

  it('respects the reason filter', async () => {
    const res = await agent
      .get('/api/reconciliation/exceptions/export')
      .query({ reason: 'DATE_MISMATCH' });

    const lines = res.text.trim().split('\n');
    expect(lines).toHaveLength(2); // header + 1 matching exception
  });

  it('rejects an invalid filter with 400 instead of exporting unfiltered data', async () => {
    const res = await agent
      .get('/api/reconciliation/exceptions/export')
      .query({ reason: 'NOT_A_REAL_REASON' });

    expect(res.status).toBe(400);
  });

  it('exports an Excel workbook of only M-104 exceptions when format=xlsx', async () => {
    const res = await agent
      .get('/api/reconciliation/exceptions/export')
      .query({ format: 'xlsx' })
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => callback(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml');
    expect(res.headers['content-disposition']).toContain('exceptions.xlsx');
    // The XLSX zip signature -- confirms a real workbook was written, not an empty/garbage buffer.
    expect((res.body as Buffer).subarray(0, 2).toString('hex')).toBe('504b');
  });

  it('exports a PDF report of only M-104 exceptions when format=pdf', async () => {
    const res = await agent
      .get('/api/reconciliation/exceptions/export')
      .query({ format: 'pdf' })
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => callback(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.headers['content-disposition']).toContain('exceptions.pdf');
    expect((res.body as Buffer).subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });

  it('rejects an unsupported export format with 400', async () => {
    const res = await agent.get('/api/reconciliation/exceptions/export').query({ format: 'docx' });

    expect(res.status).toBe(400);
  });

  it('honors the requested sort order in the exported row order', async () => {
    const res = await agent
      .get('/api/reconciliation/exceptions/export')
      .query({ sortBy: 'transactionId', sortOrder: 'desc' });

    const [, ...rows] = res.text.trim().split('\n');
    const transactionIds = rows.map((row) => row.split(',')[0]);
    expect(transactionIds).toEqual([...transactionIds].sort().reverse());
  });
});

describe('POST /api/reconciliation/exceptions/:id/explanation', () => {
  it('returns a mock-provider explanation for a known exception', async () => {
    const res = await agent.post('/api/reconciliation/exceptions/T1006/explanation');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      explanationText: expect.any(String),
      generatedBy: 'mock',
    });
  });

  it('returns 404 for an unknown transaction id', async () => {
    const res = await agent.post('/api/reconciliation/exceptions/DOES-NOT-EXIST/explanation');

    expect(res.status).toBe(404);
  });
});
