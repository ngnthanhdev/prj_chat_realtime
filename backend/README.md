# Backend

NestJS + Postgres backend for `prj_chat_realtime`.

## Phase 1 scope
- Admin auth with email/password
- HttpOnly cookie access/refresh token flow
- Customer guest session creation
- Text messaging APIs
- Socket.IO realtime foundation
- Prisma schema for admins, refresh tokens, chat sessions, and messages

Image upload is planned for the next phase. Local disk storage will live under `uploads/chat-images/`.

## Setup
1. Copy env:
   - `cp .env.example .env`
2. Start local Postgres:
   - `docker compose up -d postgres`
3. Install packages:
   - `npm install`
4. Generate Prisma client:
   - `npm run prisma:generate`
5. Run migration:
   - `npm run prisma:migrate -- --name init`
6. Seed first admin:
   - `npm run seed:admin`
7. Start backend:
   - `npm run start:dev`

For a fuller local guide, see:
- `../docs/backend-local-setup.md`
- `scripts/dev-setup.sh`

## Default local runtime
- API: `http://localhost:4000`
- uploads static root: `http://localhost:4000/uploads`
- websocket: same host via Socket.IO

## Main routes
### Admin auth
- `POST /auth/admin/login`
- `POST /auth/admin/refresh`
- `POST /auth/admin/logout`
- `GET /auth/admin/me`

### Admin chat
- `GET /admin/chat-sessions`
- `PATCH /admin/chat-sessions/:sessionId/close`
- `GET /admin/chat-sessions/:sessionId/messages`
- `POST /admin/chat-sessions/:sessionId/messages/text`

### Customer chat
- `POST /customer/chat-sessions`
- `GET /customer/chat-sessions/:sessionId/messages`
- `POST /customer/chat-sessions/:sessionId/messages/text`

## Websocket events
- client emit: `session.join`
- server emit: `session.joined`, `message.created`, `session.created`, `session.updated`
