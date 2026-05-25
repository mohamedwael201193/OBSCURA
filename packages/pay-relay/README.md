# Obscura Pay Relay — ERC-4337 UserOp Forwarder

Lightweight Express server that accepts `PackedUserOperation` (ERC-4337 v0.7) from the frontend and forwards them to an Alchemy / Pimlico bundler.

## Endpoints

| Method | Path        | Description                               |
|--------|-------------|-------------------------------------------|
| GET    | `/health`   | Liveness check                            |
| POST   | `/relay`    | Submit a UserOp → returns `userOpHash`    |
| POST   | `/simulate` | Estimate gas without submitting           |

## Setup

```bash
cd packages/pay-relay
npm install
cp .env.example .env   # fill in BUNDLER_URL
npm run dev
```

## Environment

| Variable         | Required | Description                                         |
|------------------|----------|-----------------------------------------------------|
| `BUNDLER_URL`    | ✅       | ERC-4337 bundler RPC (e.g. Alchemy/Pimlico)         |
| `PAYMASTER_ADDRESS` | —     | Informational; not used for signing in this relay   |
| `PORT`           | —        | Default `3701`                                      |
| `ALLOWED_ORIGINS` | —       | Comma-separated CORS origins (default localhost)    |

## Security notes

- Rate-limited to 20 requests/IP/minute (in-memory, reset on restart)
- Request body capped at 16 KB
- Bundler URL is server-side only — never exposed to the client
- No private key in this relay (it only forwards the signed UserOp)
