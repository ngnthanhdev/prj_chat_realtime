# Realtime Chat Migration Design: NestJS + Postgres

## Goal
Migrate the current Firebase-based realtime chat MVP to a self-hosted architecture using NestJS and Postgres, with backend-owned auth, database, websocket realtime delivery, and local-disk image storage.

## Chosen Direction
- Backend: NestJS monolith under `backend/`
- Database: Postgres
- ORM: Prisma
- Admin auth: email/password, access token + refresh token, both managed through backend with HttpOnly cookies for web
- Customer auth: backend-issued guest token scoped to one chat session
- Realtime: NestJS WebSocket gateway with room-per-session model
- Image storage: backend local disk storage under `backend/uploads/chat-images/`
- Existing web/mobile UIs: retained where possible, but data/auth layers replaced

## Why this direction
This removes Firebase lock-in, avoids Firebase Storage costs, centralizes access control in one backend, and keeps the MVP deployable on a single machine or VPS. Local disk image storage is acceptable for MVP and can later be swapped to object storage behind the same storage interface.

## Project Layout
- `web/`: Next.js admin frontend
- `mobile/`: Expo customer frontend
- `backend/`: NestJS API, websocket gateway, auth, upload handling, Prisma schema
- `docs/specs/`: architecture and implementation docs

## Backend Modules
### auth
Handles admin login, refresh, logout, password verification, cookie issuance, and guard utilities.

### admins
Admin account management. MVP scope only needs seed/bootstrap creation plus current-admin profile lookup.

### chat-sessions
Create customer sessions, list sessions for admin, fetch single session details, close sessions.

### messages
Create/list text and image messages, persist metadata, enforce sender permissions.

### realtime
WebSocket gateway for room join/leave and new-message or session-update broadcast.

### uploads
Multer-based image upload validation, file naming, local storage path generation, static URL generation.

### prisma/database
Schema, migrations, and database access.

## Data Model
### admins
- `id` UUID
- `email` unique
- `passwordHash`
- `displayName`
- `createdAt`
- `updatedAt`

### admin_refresh_tokens
- `id` UUID
- `adminId`
- `tokenHash`
- `expiresAt`
- `createdAt`
- `revokedAt` nullable
- optional `userAgent` and `ipAddress` for audit/debug

### chat_sessions
- `id` UUID
- `customerName`
- `customerTokenHash`
- `status` enum: `open | closed`
- `createdAt`
- `updatedAt`
- `lastMessage` nullable
- `lastMessageType` enum nullable: `text | image`
- `lastMessageAt` nullable

### messages
- `id` UUID
- `sessionId`
- `senderType` enum: `customer | admin`
- `messageType` enum: `text | image`
- `text` nullable
- `imageUrl` nullable
- `createdAt`

## Auth Design
### Admin auth
Admin signs in with email/password via backend endpoint. Backend verifies bcrypt hash, creates access token and refresh token, stores refresh token hash in database, and sets both tokens as HttpOnly cookies.

Recommended cookie shape:
- access token: short-lived, about 15 minutes
- refresh token: longer-lived, about 7 to 30 days

Web frontend behavior:
- calls backend with `credentials: 'include'`
- loads current admin via `/auth/me`
- if access token expires, frontend can call `/auth/refresh`
- logout revokes refresh token row and clears cookies

### Customer auth
Customer does not have a reusable user account. On mobile, customer enters a name and calls create-session endpoint. Backend creates a chat session and returns:
- `sessionId`
- `customerToken`

The mobile app stores this token locally for that session only and sends it in `Authorization: Bearer <customerToken>` for customer-scoped session and message endpoints, plus websocket auth.

This keeps customer access limited to exactly one chat session.

## HTTP API Design
### Admin auth
- `POST /auth/admin/login`
- `POST /auth/admin/refresh`
- `POST /auth/admin/logout`
- `GET /auth/admin/me`

### Admin chat
- `GET /admin/chat-sessions`
- `GET /admin/chat-sessions/:sessionId/messages`
- `POST /admin/chat-sessions/:sessionId/messages/text`
- `POST /admin/chat-sessions/:sessionId/messages/image`
- `PATCH /admin/chat-sessions/:sessionId/close`

### Customer chat
- `POST /customer/chat-sessions`
- `GET /customer/chat-sessions/:sessionId/messages`
- `POST /customer/chat-sessions/:sessionId/messages/text`
- `POST /customer/chat-sessions/:sessionId/messages/image`

## WebSocket Design
### Transport
Use NestJS WebSocket gateway, likely Socket.IO for practical auth, rooms, reconnect behavior, and easier web/mobile client support.

### Rooms
Each chat session maps to one room:
- `session:<sessionId>`

### Admin websocket flow
- frontend connects after auth is established
- backend validates admin from token/cookie-derived handshake auth
- admin can subscribe to session rooms as they open conversations
- backend may also broadcast session-list updates to an admin-wide channel

### Customer websocket flow
- mobile connects with `sessionId` + `customerToken`
- backend validates token hash against that session
- customer is allowed to join only their own room

### Broadcast events
- `message.created`
- `session.updated`
- optional `session.created` for admin inbox/list refresh

## Image Upload Design
### Storage approach
Store images on local disk under:
- `backend/uploads/chat-images/<sessionId>/<timestamp>-<safe-filename>`

Expose static files from backend, for example:
- `/uploads/chat-images/...`

Database stores the generated public URL in `messages.imageUrl`.

### Validation rules
- MIME types limited to common images: jpeg, png, webp
- file size limit, recommended 5 MB for MVP
- sanitize filename
- reject non-image files

### Upload flow
1. client picks image
2. client sends multipart request to image endpoint
3. backend validates auth and file
4. backend stores file on disk
5. backend creates image message row
6. backend updates session summary fields
7. backend broadcasts websocket event

## Authorization Rules
### Admin
- can list all sessions
- can read all messages
- can send text/image to any session
- can close any session

### Customer
- can only access the session tied to their token
- can only read/send inside that one session
- cannot list other sessions
- cannot close sessions

## Error Handling
- invalid login returns generic auth error
- invalid or expired customer token returns 401
- forbidden session access returns 403
- closed sessions reject new customer/admin sends unless business rule changes later
- oversized or invalid image returns 400
- websocket unauthorized handshake is rejected early

## Frontend Migration Plan
### Web
Replace Firebase auth/session listeners with backend API + websocket client:
- remove Google sign-in and admin-claim checks
- add email/password login form
- fetch session list from backend
- subscribe to websocket updates
- send text/image via backend endpoints
- keep current session list and message UI where possible

### Mobile
Replace anonymous Firebase auth and Firestore subscriptions with backend API + websocket client:
- create session through backend after customer enters name
- store returned `sessionId` and `customerToken`
- fetch initial messages from backend
- subscribe to websocket room for live updates
- send text/image via backend endpoints

## Backend Bootstrap Requirements
- Prisma schema and first migration
- NestJS static file serving for uploads
- env config for Postgres, JWT secrets, cookie settings, upload path, public base URL
- seed or bootstrap flow for first admin account

## Suggested Environment Variables
- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_EXPIRES_IN`
- `JWT_REFRESH_EXPIRES_IN`
- `ADMIN_COOKIE_DOMAIN` optional
- `APP_PUBLIC_BASE_URL`
- `UPLOAD_DIR`
- `CORS_ORIGIN_WEB`
- `CORS_ORIGIN_MOBILE` optional depending on runtime path

## Delivery Phases
### Phase 1
- scaffold NestJS backend
- Prisma + Postgres schema
- admin auth endpoints and cookie flow
- customer session creation
- text messaging endpoints
- websocket realtime for text messages

### Phase 2
- image upload endpoints and static serving
- wire web/mobile image flows to backend
- session close flow
- cleanup old Firebase dependencies from clients

### Phase 3
- docs refresh
- smoke test both clients against backend
- optional migration cleanup of Firebase docs/rules/files

## Tradeoffs
### Why not polling or SSE first
Polling is simpler but weaker for a chat-first product. Socket.IO with NestJS gives cleaner realtime behavior for both admin and customer flows with acceptable complexity.

### Why not object storage now
Local disk is cheaper and faster to stand up for MVP. The storage layer should still be coded behind a service boundary so it can later move to S3 or R2 without changing controller contracts.

### Why not customer accounts
Customer accounts are unnecessary for the current support-chat MVP. Guest tokens keep the flow lightweight and reduce friction.

## Success Criteria
- admin can log in with backend-owned credentials
- customer can create a chat session with name only
- both sides can send and receive text in realtime
- both sides can send and receive image messages
- image files persist on backend local disk and render correctly
- closed sessions block further sending
- no Firebase dependency remains in runtime chat/auth flow
