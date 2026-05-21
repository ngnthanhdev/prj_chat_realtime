# prj_chat_realtime

MVP realtime chat between customer mobile app and admin web app.

## Features in current MVP
- Customer enters name on mobile before chatting
- Each mobile entry creates a new chat session
- Customer sends text and images in realtime
- Admin signs in on web with Google
- Admin sees session list and replies in realtime
- Images are uploaded through Firebase Storage

## Stack
- Web: Next.js
- Mobile: Expo React Native
- Backend: Firebase Firestore, Storage, Auth

## Structure
- `web/`: admin web app
- `mobile/`: customer mobile app
- `docs/specs/`: working specs updated during implementation
- `firestore.rules`: Firestore security rules starter
- `storage.rules`: Firebase Storage security rules starter

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure Firebase
Create these files from the examples:
- `web/.env.local`
- `mobile/.env.example` -> copy values into Expo env handling as needed

### 3. Required Firebase services
- Authentication
  - enable Google provider for admin web
  - enable Anonymous provider for mobile customers
- Firestore Database
- Firebase Storage

### 4. Run apps
```bash
npm run dev:web
npm run dev:mobile
```

## Environment variables

### Web
Use `web/.env.local`

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

### Mobile
Use Expo public envs

```bash
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
```

## Notes
- Current rules files are starter rules for MVP and should be hardened before production.
- The web app currently treats any signed-in Google user as admin at app level. Production should enforce admin access with custom claims or role documents.
