const express = require('express');
const path = require('path'); // <- මෙතන FIX කළා
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
require('dotenv').config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const production = process.env.NODE_ENV === 'production';
app.set('trust proxy', 1);
const storePath = process.env.NODE_ENV === 'test' ? path.join(__dirname, 'data', 'test-store.json') : path.join(__dirname, 'data', 'store.json');
const config = { min: Number(process.env.MIN_TRANSACTION_LKR || 100), max: Number(process.env.MAX_TRANSACTION_LKR || 500000) };
const origins = (process.env.CLIENT_ORIGIN || '').split(',').map(x => x.trim()).filter(Boolean);
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'test' ? 'test-only-fast-cash-secret-01234567890123456789' : '');
if ((!JWT_SECRET || JWT_SECRET.length < 32) && process.env.NODE_ENV !== 'test') {
  console.error('[CONFIG_ERROR] JWT_SECRET must be set and at least 32 characters long.');
  process.exit(1);
}

let memoryStore = null;

function emptyStore() { return { users: [], transactions: [], supportRequests: [], auditLogs: [], promotions: [{ id: 'welcome', title: 'New Player Promotion', text: 'Ask the agent for current eligibility details. Terms & Conditions apply.', active: true }] }; }
function readStore() {
  if (process.env.NODE_ENV === 'test') {
    if (!memoryStore) memoryStore = emptyStore();
    return memoryStore;
  }
  try { return JSON.parse(fs.readFileSync(storePath, 'utf8')); } catch { return emptyStore(); }
}
function writeStore(data) {
  if (process.env.NODE_ENV === 'test') {
    memoryStore = data;
    return;
  }
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  fs.writeFileSync(storePath, JSON.stringify(data, null, 2), { mode: 0o600 });
}
function ensureAdmin() { const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase(); const password = process.env.ADMIN_PASSWORD; if (!adminEmail || !password || password.length < 8) return; const data = readStore(); if (data.users.some(u => u.email === adminEmail)) return; data.users.push({ id: id('USR'), email: adminEmail, fullName: 'Administrator', passwordHash: bcrypt.hashSync(password, 12), role: 'ADMIN', createdAt: new Date().toISOString() }); writeStore(data); }
ensureAdmin();
function publicUser(user) { return { id: user.id, email: user.email, fullName: user.fullName, playerId: user.playerId || null, role: user.role, createdAt: user.createdAt }; }
function id(prefix) { return `${prefix}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`; }
function sanitizeTransaction(tx, admin = false) { const item = { ...tx }; if (!admin && item.accountNumber) item.accountNumber = `••••${item.accountNumber.slice(-4)}`; return item; }
function createToken(user) { return jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: '8h' }); }
function setAuth(res, token) { res.cookie('fast_cash_session', token, { httpOnly: true, sameSite: 'lax', secure: production, maxAge: 8 * 60 * 60 * 1000, path: '/' }); }
function auth(required = true) { return (req, res, next) => { const bearer = req.get('authorization')?.replace(/^Bearer\s+/i, ''); const token = bearer || req.cookies.fast_cash_session; if (!token) return required ? res.status(401).json({ error: 'Authentication required' }) : next(); try { req.auth = jwt.verify(token, JWT_SECRET); return next(); } catch { return res.status(401).json({ error: 'Session expired. Please sign in again.' }); } }; }
function admin(req, res, next) { if (req.auth?.role !== 'ADMIN') return res.status(403).json({ error: 'Administrator access required' }); next(); }
function validation(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      console.warn(`[VALIDATION_FAILED] ${req.method} ${req.path}:`, JSON.stringify(fieldErrors));
      return res.status(400).json({
        error: 'Please correct the highlighted details.',
        fields: fieldErrors
      });
    }
    req.body = result.data;
    next();
  };
}
function audit(actorId, action, subjectId, details = {}) { const data = readStore(); data.auditLogs.push({ id: id('AUD'), actorId, action, subjectId, details, createdAt: new Date().toISOString() }); writeStore(data); }

app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-origin' } }));
app.use(cors({ origin(origin, callback) { if (!production) return callback(null, true); if (!origin || origins.includes(origin)) return callback(null, true); return callback(new Error('Origin not allowed')); }, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));

const email = z.string().trim().email('Enter a valid email address.').max(254);

const playerIdPreprocess = z.preprocess(val => {
  if (typeof val === 'number') return String(val).trim();
  if (typeof val === 'string') return val.replace(/[\s-]/g, '').trim();
  return val;
}, z.string().trim().regex(/^\d{5,20}$/, 'Player ID must contain 5 to 20 numeric digits.'));

const optionalPlayerId = z.preprocess(val => {
  if (!val || val === '') return undefined;
  if (typeof val === 'number') return String(val).trim();
  if (typeof val === 'string') {
    const cleaned = val.replace(/[\s-]/g, '').trim();
    return cleaned === '' ? undefined : cleaned;
  }
  return val;
}, z.string().trim().regex(/^\d{5,20}$/, 'Player ID must contain 5 to 20 numeric digits.').optional());

const amount = z.preprocess(val => {
  if (typeof val === 'string') {
    const cleaned = val.replace(/,/g, '').trim();
    return cleaned === '' ? undefined : Number(cleaned);
  }
  return val;
}, z.number({ invalid_type_error: 'Enter a valid numeric amount.' })
     .finite('Enter a valid numeric amount.')
     .min(config.min, `Minimum amount is LKR ${config.min.toLocaleString()}.`)
     .max(config.max, `Maximum amount is LKR ${config.max.toLocaleString()}.`));

const accountNumber = z.preprocess(val => {
  if (typeof val === 'string') return val.replace(/[\s-]/g, '').trim();
  return val;
}, z.string().trim().regex(/^\d{6,24}$/, 'Account number must contain 6 to 24 numeric digits.'));

const securityCode = z.preprocess(val => {
  if (!val || typeof val !== 'string' || val.trim() === '') return undefined;
  return val.trim();
}, z.string().trim().max(40, 'Security code is too long.').optional());

const contactNumber = z.preprocess(val => {
  if (!val || typeof val !== 'string' || val.trim() === '') return undefined;
  return val.trim();
}, z.string().regex(/^[+\d\s-]{7,20}$/, 'Enter a valid contact phone number.').optional());

const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters.').max(80),
  email,
  password: z.string().min(10, 'Password must be at least 10 characters.').max(128),
  playerId: optionalPlayerId
});

const loginSchema = z.object({ email, password: z.string().min(1, 'Password is required.').max(128) });

const depositSchema = z.object({
  playerId: playerIdPreprocess,
  amount,
  paymentMethod: z.enum(['BANK_TRANSFER', 'MOBILE_BANKING', 'OTHER'], { errorMap: () => ({ message: 'Please select a valid payment method.' }) }),
  receiptImage: z.string().max(5000000, 'Receipt image file is too large.').optional().nullable(),
  receiptReference: z.string().trim().max(80).optional().nullable()
});

const withdrawalSchema = z.object({
  playerId: playerIdPreprocess,
  fullName: z.string().trim().min(2, 'Full name is required (at least 2 characters).').max(80),
  bank: z.string().trim().min(2, 'Bank name is required.').max(60),
  accountNumber,
  amount,
  securityCode,
  contactNumber
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/api/config', (req, res) => res.json({
  minTransaction: config.min,
  maxTransaction: config.max,
  whatsappEnabled: Boolean(process.env.WHATSAPP_NUMBER),
  whatsappNumber: process.env.WHATSAPP_NUMBER || '',
  promoCode: 'VGSL',
  official1xbetUrl: process.env.OFFICIAL_1XBET_URL || 'https://1xbet.com/en/user/registration/',
  agentBankDetails: [
    { id: 'boc', name: 'BOC (Walasmulla)', number: '95645895', icon: '🏦', type: 'BANK' },
    { id: 'peoples', name: "PEOPLE'S BANK", number: '120200380030196', icon: '🏦', type: 'BANK' },
    { id: 'sampath', name: 'SAMPATH BANK', number: '105456146706', icon: '🏦', type: 'BANK' },
    { id: 'lolc', name: 'LOLC BANK', number: '01210012722', icon: '🏦', type: 'BANK' },
    { id: 'ipay_1', name: 'iPay Mobile 1', number: '0740452530', icon: '📱', type: 'IPAY' },
    { id: 'ipay_2', name: 'iPay Mobile 2', number: '0703346455', icon: '📱', type: 'IPAY' }
  ],
  paymentMethods: ['BANK_TRANSFER', 'MOBILE_BANKING', 'OTHER']
}));
app.get('/api/promotions', (req, res) => res.json({ promotions: readStore().promotions.filter(p => p.active) }));
app.get('/api/sports', (req, res) => res.status(503).json({ error: 'Live sports data is not configured.', data: [] }));
app.get('/api/live', (req, res) => res.status(503).json({ error: 'Live betting data is not configured.', data: [] }));
app.get('/api/casino', (req, res) => res.status(503).json({ error: 'Casino data is not configured.', data: [] }));

app.post('/api/auth/register', validation(registerSchema), async (req, res, next) => { try { const data = readStore(); if (data.users.some(u => u.email === req.body.email.toLowerCase())) return res.status(409).json({ error: 'An account already exists with this email.' }); const user = { id: id('USR'), email: req.body.email.toLowerCase(), fullName: req.body.fullName, playerId: req.body.playerId || null, passwordHash: await bcrypt.hash(req.body.password, 12), role: 'USER', createdAt: new Date().toISOString() }; data.users.push(user); writeStore(data); const token = createToken(user); setAuth(res, token); res.status(201).json({ user: publicUser(user), token }); } catch (error) { next(error); } });
app.post('/api/auth/login', validation(loginSchema), async (req, res, next) => { try { const user = readStore().users.find(u => u.email === req.body.email.toLowerCase()); if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) return res.status(401).json({ error: 'Email or password is incorrect.' }); const token = createToken(user); setAuth(res, token); res.json({ user: publicUser(user), token }); } catch (error) { next(error); } });
app.post('/api/auth/logout', (req, res) => { res.clearCookie('fast_cash_session', { httpOnly: true, sameSite: 'lax', secure: production, path: '/' }); res.status(204).end(); });
app.get('/api/auth/me', auth(false), (req, res) => { if (!req.auth) return res.json({ user: null }); const user = readStore().users.find(u => u.id === req.auth.sub); if (!user) return res.json({ user: null }); res.json({ user: publicUser(user) }); });
app.post('/api/auth/forgot-password', validation(z.object({ email })), (req, res) => res.json({ message: 'If an account matches this email, support will provide secure recovery instructions.' }));

// HADAPU KOTAASA: auth(true) (Authentication requirement) eka mulata dala validation eka 2weniwata damma.
function transaction(kind) {
  const schema = kind === 'DEPOSIT' ? depositSchema : withdrawalSchema;
  return [
    auth(true), // Fixed: Require auth by default
    validation(schema),
    (req, res) => {
      const data = readStore();
      const userId = req.auth?.sub || 'GUEST';
      const tx = {
        id: id(kind === 'DEPOSIT' ? 'DEP' : 'WDR'),
        type: kind,
        userId,
        ...req.body,
        status: 'PENDING',
        notes: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      data.transactions.unshift(tx);
      writeStore(data);
      res.status(201).json({
        transaction: sanitizeTransaction(tx),
        whatsappMessage: process.env.WHATSAPP_NUMBER
          ? `${kind} REQUEST\nRequest ID: ${tx.id}\nPlayer ID: ${tx.playerId}\nAmount: LKR ${tx.amount}${kind === 'DEPOSIT' ? `\nPayment method: ${tx.paymentMethod}` : `\nBank: ${tx.bank}`}`
          : null
      });
    }
  ];
}
app.post('/api/deposits', ...transaction('DEPOSIT'));
app.post('/api/withdrawals', ...transaction('WITHDRAWAL'));
app.get('/api/transactions', auth(true), (req, res) => {
  const data = readStore();
  const userId = req.auth?.sub;
  const list = userId 
    ? data.transactions.filter(t => t.userId === userId).map(t => sanitizeTransaction(t))
    : data.transactions.slice(0, 20).map(t => sanitizeTransaction(t));
  res.json({ transactions: list });
});
app.post('/api/support/requests', auth(), validation(z.object({ message: z.string().trim().min(3).max(2000) })), (req, res) => { const data = readStore(); const request = { id: id('SUP'), userId: req.auth.sub, message: req.body.message, status: 'OPEN', createdAt: new Date().toISOString() }; data.supportRequests.unshift(request); writeStore(data); res.status(201).json({ request }); });
app.post('/api/support/chat', rateLimit({ windowMs: 60 * 1000, max: 12 }), validation(z.object({ messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().trim().min(1).max(1000) })).min(1).max(20) })), async (req, res) => { const text = req.body.messages.filter(m => m.role === 'user').at(-1).content.toLowerCase(); let reply = 'I can help with deposit and withdrawal requests, finding a Player ID, support, and responsible gambling. Account-specific information requires sign-in.'; if (text.includes('deposit')) reply = `To submit a deposit request, enter your Player ID, amount (LKR ${config.min}–${config.max}), payment method, then review and submit it. Processing status is shown after submission.`; else if (text.includes('withdraw')) reply = 'To request a withdrawal, provide your Player ID, name, bank, account number and amount. A request remains pending until an authorized agent updates it.'; else if (text.includes('player')) reply = 'Your 1xBet Player ID is available in the 1xBet account/profile area. Enter only the numeric Player ID in Fast Cash forms.'; else if (text.includes('gambl')) reply = 'Gambling involves financial risk. Only adults 18+ should participate, never chase losses, and take a break or seek support if it becomes hard to control.'; res.json({ reply, mode: process.env.AI_API_KEY ? 'local-safe-fallback' : 'local' }); });

app.get('/api/admin/overview', auth(), admin, (req, res) => { const data = readStore(); const pending = data.transactions.filter(t => t.status === 'PENDING').length; res.json({ stats: { users: data.users.length, transactions: data.transactions.length, pending }, transactions: data.transactions.map(t => sanitizeTransaction(t, true)), supportRequests: data.supportRequests }); });
app.patch('/api/admin/transactions/:id', auth(), admin, validation(z.object({ status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED', 'CANCELLED']), note: z.string().trim().max(1000).optional() })), (req, res) => {
  const data = readStore();
  const tx = data.transactions.find(t => t.id === req.params.id);
  if (!tx) return res.status(404).json({ error: 'Transaction not found.' });
  const transitions = {
    PENDING: ['PROCESSING', 'COMPLETED', 'REJECTED', 'CANCELLED'],
    PROCESSING: ['COMPLETED', 'REJECTED', 'CANCELLED'],
    COMPLETED: [],
    REJECTED: [],
    CANCELLED: []
  };
  if (tx.status !== req.body.status && !transitions[tx.status]?.includes(req.body.status)) {
    return res.status(409).json({ error: `Invalid status transition: ${tx.status} → ${req.body.status}` });
  }
  tx.status = req.body.status;
  tx.updatedAt = new Date().toISOString();
  if (!Array.isArray(tx.notes)) tx.notes = [];
  if (req.body.note) tx.notes.push({ text: req.body.note, by: req.auth.sub, at: tx.updatedAt });
  writeStore(data);
  audit(req.auth.sub, 'TRANSACTION_STATUS_CHANGED', tx.id, { status: tx.status, note: req.body.note || null });
  res.json({ transaction: sanitizeTransaction(tx, true) });
});

app.use(express.static(path.join(__dirname, 'dist'), { index: false, maxAge: production ? '1h' : 0 }));
const spaFallbackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' }
});
app.get('*', spaFallbackLimiter, (req,res) => res.sendFile(path.join(__dirname, 'dist', 'index.html'), err => { if (err) res.status(404).json({ error: 'Application build not found. Run npm run build.' }); }));
// eslint-disable-next-line no-unused-vars
app.use((error, req, res, next) => { if (error.message === 'Origin not allowed') return res.status(403).json({ error: 'Origin not allowed.' }); console.error('Request failed:', error.name, error.message); res.status(500).json({ error: 'Something went wrong. Please try again.' }); });

if (require.main === module) app.listen(PORT, '0.0.0.0', () => console.log(`Fast Cash listening on http://localhost:${PORT}`));
module.exports = { app, readStore, emptyStore };
