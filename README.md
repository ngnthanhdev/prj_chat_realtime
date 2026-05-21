# prj_chat_realtime

MVP realtime chat between customer mobile app and admin web app.

## Stack
- Web: Next.js
- Mobile: Expo React Native
- Backend: Firebase Firestore, Storage, Auth

## Structure
- `web/`: admin web app
- `mobile/`: customer mobile app
- `docs/specs/`: working specs updated during implementation

## Current status
- Task 1: initial spec and project scaffold
- Next: customer session flow and realtime text messaging

## Environment variables

### Web
Create `web/.env.local`

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

### Mobile
Create `.env` or configure Expo public envs

```bash
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
```
