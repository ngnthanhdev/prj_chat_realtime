# Realtime Chat MVP Design

## Goal
Build a realtime chat system between a customer mobile app and an admin web app.

## Roles
- Mobile app: customer side, customer must enter their name before chatting.
- Web app: admin side, used by the responder.

## MVP Scope
- Send and receive text messages in realtime.
- Send and receive image messages in realtime.
- Admin can see all chat sessions and reply to any session.
- Each app entry from a customer creates a new chat session.

## Stack
- Web: Next.js
- Mobile: Expo React Native
- Backend platform: Firebase
  - Firestore for sessions and messages
  - Storage for images
  - Auth for admin login and anonymous customer login

## Data Model

### chat_sessions
- id
- customerName
- customerUid
- status: open | closed
- createdAt
- updatedAt
- lastMessage
- lastMessageType
- lastMessageAt

### chat_sessions/{sessionId}/messages
- id
- senderType: customer | admin
- messageType: text | image
- text
- imageUrl
- createdAt

## Flows

### Mobile
1. Sign in anonymously.
2. Enter customer name.
3. Create a new chat session.
4. Open chat room for that session.
5. Send text and images.
6. Receive admin messages in realtime.

### Web
1. Admin logs in.
2. Admin sees chat session list.
3. Admin opens a session.
4. Admin reads and replies in realtime.
5. Admin can send text and images.

## Firebase Notes
- Customers use anonymous auth.
- Admins use Firebase Auth and are identified through custom claims or a temporary allowlist in app logic for MVP.
- Images are uploaded to Firebase Storage and their URL is stored in messages.

## Non-goals for v1
- Push notifications
- Typing indicator
- Seen/delivered status
- Multi-admin assignment
- Resume previous customer session
