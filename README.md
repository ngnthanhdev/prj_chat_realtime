# prj_chat_realtime

MVP realtime chat between customer mobile app and admin web app.

## Features in current migration target
- Customer enters name on mobile before chatting
- Each mobile entry creates a new chat session
- Customer and admin exchange messages in realtime
- Admin signs in on web with backend-owned credentials
- Backend owns auth, database, websocket delivery, and upload flow

## Stack
- Web: Next.js
- Mobile: Expo React Native
- Backend: NestJS + Postgres + Prisma + Socket.IO

## Structure
- `web/`: admin web app
- `mobile/`: customer mobile app
- `backend/`: NestJS API and websocket server
- `docs/specs/`: working specs updated during implementation
- `firestore.rules`: legacy Firebase rules, pending cleanup
- `storage.rules`: legacy Firebase rules, pending cleanup

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Backend setup
See `backend/README.md`.

### 3. Current app status
- `backend/` is the new source of truth for auth and chat data.
- `web/` and `mobile/` now point at the new backend for phase-1 text chat flows.
- image upload is now wired through backend local-disk endpoints for both web and mobile.
- Firebase docs and rule files remain temporarily for reference until final cleanup is complete.

### 4. Run apps
```bash
npm run dev:web
npm run dev:mobile
```

Run backend separately from `backend/` once env and Postgres are ready.

## Environment variables
Backend env now lives in:
- `backend/.env`

See:
- `backend/.env.example`
- `docs/backend-local-setup.md`

Included backend local-dev support now has:
- `backend/.env`
- `backend/docker-compose.yml`
- `backend/scripts/dev-setup.sh`

Main backend envs include:
- `DATABASE_URL`
- JWT secrets and expiry config
- cookie names
- app origin/base URL
- upload directory
- bootstrap admin credentials

## Notes
- NestJS + Postgres migration spec: `docs/specs/2026-05-22-nestjs-postgres-chat-design.md`
- Backend phase 1 now covers admin auth, guest customer session creation, text messaging APIs, and websocket scaffolding.
- Web and mobile now use backend HTTP APIs plus Socket.IO session events for realtime updates.
- Backend image upload now targets local disk storage under `backend/uploads/`.
- Firebase client dependencies have been removed from active app flows and only legacy cleanup remains.
