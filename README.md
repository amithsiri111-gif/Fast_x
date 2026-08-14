nano# Fast Cash

A mobile-first Node.js + React payment-support portal for a Sri Lankan 1xBet agent workflow. It supports authenticated deposit/withdrawal requests, official agent deposit accounts with masked privacy view and copy-to-clipboard, secure request status tracking, admin review APIs, WhatsApp-ready message templates, PWA installation, and responsible-gambling messaging.

> Fast Cash is an independent support portal. It does not display live odds, balances, results, or claim that payments are complete until an authorized admin changes the request status. Adults 18+ only.

## Features

- **Official Agent Deposit Accounts**: Bank details for BOC (), People's Bank, Sampath Bank, LOLC Bank, and iPay Mobile with privacy masking (`1202••••••••0196`) and instant one-click copy to clipboard.
- **Responsive UI**: React/Vite client with desktop navigation, accessible mobile drawer, and fixed mobile action bar.
- **Express REST API**: Protected with Helmet, restrictive CORS, rate limits, Zod validation, HTTP-only sessions, and bcrypt password hashing.
- **Persistent Local Store**: JSON database (`data/store.json`, ignored by git). Easily replaceable with PostgreSQL or MongoDB.
- **Deposit & Withdrawal Workflows**: Generated request IDs and status tracking (`PENDING`, `PROCESSING`, `COMPLETED`, `REJECTED`, `CANCELLED`).
- **Admin Management**: Protected admin API endpoints for transaction review and audit logging.
- **Safe Support Assistant**: Local support guidance without exposing keys to the browser.
- **PWA Ready**: Web app manifest, static asset service worker, SEO metadata, and mobile install support.

## Requirements

- Node.js 20 or later
- npm 10 or later

## Installation & Running

```bash
# 1. Install dependencies
npm install

# 2. Copy environment configuration
cp .env.example .env

# 3. Build & start full-stack server (Port 3000)
npm run build
npm start
```

Open **`http://localhost:3000`** in your browser.

### Running in Development Mode

- **Full-Stack (Port 3000)**:
  ```bash
  npm run dev
  ```
  *(Builds client and starts `node server.js` on `http://localhost:3000`)*

- **Frontend Only with Vite HMR (Port 5176)**:
  ```bash
  npm run dev:client
  ```
  *(Starts Vite development server on `http://localhost:5176`)*

## Official Agent Accounts (Deposit)

| Institution | Details / Account Number |
| --- | --- |
| 🏦 **BOC (Walasmulla)** | `000000000` |
| 🏦 **PEOPLE'S BANK** | `0000000000` |
| 🏦 **SAMPATH BANK** | `000000000` |
| 🏦 **LOLC BANK** | `0000000000` |
| 📱 **iPay Mobile** | `0712345678` / `0712345678` |

## Environment Variables

| Variable | Purpose |
| --- | --- |
| `PORT` | API/server port (default: 3000) |
| `NODE_ENV` | `development`, `test`, or `production` |
| `CLIENT_ORIGIN` | Comma-separated permitted browser origins |
| `SESSION_SECRET`, `JWT_SECRET` | Long unique production secrets |
| `WHATSAPP_NUMBER` | Optional international agent number |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Reserved for admin provisioning |
| `OFFICIAL_1XBET_URL` | Optional verified official link |
| `AI_API_KEY` | Optional server-only provider key |
| `MIN_TRANSACTION_LKR`, `MAX_TRANSACTION_LKR` | Request validation limits |

## API Overview

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET /api/config` (Returns min/max limits & agent bank accounts)
- `POST /api/deposits`, `POST /api/withdrawals`, `GET /api/transactions`
- `POST /api/support/chat`, `POST /api/support/requests`
- `GET /api/admin/overview`, `PATCH /api/admin/transactions/:id` (Admin only)

## Quality Commands

```bash
npm run lint
npm test
npm run build
```

## Security & Production Notes

Set `NODE_ENV=production`, use HTTPS, supply unique secrets, configure trusted `CLIENT_ORIGIN` values, and use a managed database implementation before multi-instance deployment. Do not put private bank secrets or unauthenticated admin registration routes in frontend source code. The service worker never caches API responses or sensitive credentials.


## Local run

Use one application port for the normal app:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The Vite-only client command is `npm run dev:client` and uses port 5176; it is not required for the normal full-stack run.

## Admin approval

Set `ADMIN_EMAIL`, `ADMIN_PASSWORD` and a random `JWT_SECRET` (32+ characters) in your local environment. Sign in with the admin account; the drawer contains **Admin Dashboard**. Review a pending receipt and use **Processing**, **Approve / Complete**, or **Reject**. Terminal statuses cannot be changed back.

Never commit `.env` or production secrets.
