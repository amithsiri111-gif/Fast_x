import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import server from '../server.js';
const { app } = server;

describe('Fast Cash API', () => {
  let agent;
  beforeEach(() => { agent = request.agent(app); });

  it('validates registration input', async () => { 
    const r = await agent.post('/api/auth/register').send({ email: 'bad', password: 'short' }); 
    expect(r.status).toBe(400); 
  });

  it('registers and logs in a user', async () => { 
    const r = await agent.post('/api/auth/register').send({ fullName: 'Test User', email: `user${Date.now()}@example.com`, password: 'test-password-123' }); 
    expect(r.status).toBe(201); 
    expect(r.body.user.role).toBe('USER'); 
  });

  it('creates an authenticated deposit request', async () => { 
    await agent.post('/api/auth/register').send({ fullName: 'Deposit User', email: `deposit${Date.now()}@example.com`, password: 'test-password-123' }); 
    const r = await agent.post('/api/deposits').send({ playerId: '123456789', amount: 1000, paymentMethod: 'BANK_TRANSFER' }); 
    expect(r.status).toBe(201); 
    expect(r.body.transaction.status).toBe('PENDING'); 
  });

  it('creates a deposit request with bearer authentication only', async () => {
    const email = `bearer${Date.now()}@example.com`;
    const registered = await request(app).post('/api/auth/register').send({ fullName: 'Bearer User', email, password: 'test-password-123' });
    const token = registered.body.token;
    expect(token).toBeTruthy();

    const r = await request(app)
      .post('/api/deposits')
      .set('Authorization', `Bearer ${token}`)
      .send({ playerId: '123456789', amount: 1000, paymentMethod: 'BANK_TRANSFER' });

    expect(r.status).toBe(201);
    expect(r.body.transaction.status).toBe('PENDING');
  });

  it('requires authentication for deposits', async () => { 
    // FIXED: amount eka 100 idan 1000 ta wenas kala (Validation pass wi 401 labimata)
    const r = await request(app).post('/api/deposits').send({ playerId: '123456789', amount: 1000, paymentMethod: 'BANK_TRANSFER' }); 
    expect(r.status).toBe(401); 
  });

  it('validates withdrawal fields', async () => { 
    await agent.post('/api/auth/register').send({ fullName: 'Test User', email: `withdraw${Date.now()}@example.com`, password: 'test-password-123' }); 
    const w = await agent.post('/api/withdrawals').send({ playerId: '123456789', fullName: 'Test User', bank: 'Bank', accountNumber: 'bad', amount: 1 }); 
    expect(w.status).toBe(400); 
  });

  it('blocks admin routes for ordinary users', async () => { 
    await agent.post('/api/auth/register').send({ fullName: 'Test User', email: `admin${Date.now()}@example.com`, password: 'test-password-123' }); 
    const r = await agent.get('/api/admin/overview'); 
    expect(r.status).toBe(403); 
  });
});
