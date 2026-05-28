# Backend Local Setup

Use this guide to boot the new NestJS + Postgres backend locally.

## 1. Requirements
- Docker Desktop or Docker Engine
- Node.js + npm
- A free local port `5432` for Postgres
- A free local port `4000` for the NestJS backend

## 2. Env file
A local dev env has been prepared at:
- `backend/.env`

You can edit these values later, but the defaults are enough for local development.

Default seeded admin:
- email: `admin@example.com`
- password: `admin123456`

## 3. Start Postgres
From `backend/`:

```bash
docker compose up -d postgres
```

Check container:

```bash
docker ps
```

Expected container:
- `prj_chat_realtime_postgres`

## 4. Install backend dependencies
```bash
cd backend
npm install
```

## 5. Prisma generate + migrate
```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
```

## 6. Seed first admin
```bash
npm run seed:admin
```

## 7. Start backend
```bash
npm run start:dev
```

Expected backend base URL:
- `http://localhost:4000`

## 8. Quick auth smoke test
### Login
```bash
curl -i -X POST http://localhost:4000/auth/admin/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"admin123456"}'
```

Expected:
- `Set-Cookie` headers for access + refresh token
- JSON body containing admin info

### Create customer session
```bash
curl -X POST http://localhost:4000/customer/chat-sessions \
  -H 'Content-Type: application/json' \
  -d '{"customerName":"Test Customer"}'
```

Expected response:
- `sessionId`
- `customerToken`
- `status`

## 9. One-command setup
There is also a helper script:

```bash
cd backend
bash scripts/dev-setup.sh
```

This script:
- ensures `.env` exists
- starts Postgres
- installs packages
- generates Prisma client
- runs migration
- seeds admin account

## 10. Notes
- Current phase only covers text chat APIs and realtime foundation.
- Image upload is coming next.
- Web and mobile clients still need migration from Firebase to this backend.
