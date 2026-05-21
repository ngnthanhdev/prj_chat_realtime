# Firebase Deploy Guide

## 1. Install Firebase CLI
```bash
npm install -g firebase-tools
firebase login
```

## 2. Link project
```bash
firebase use --add
```

## 3. Deploy rules
```bash
firebase deploy --only firestore:rules
firebase deploy --only storage
```

## 4. Optional: deploy both together
```bash
firebase deploy --only firestore:rules,storage
```

## 5. Verify auth setup
In Firebase Console:
- Authentication > Sign-in method
- enable Google
- enable Anonymous

## 6. Grant admin claim
Follow `docs/firebase-admin-setup.md`.

## 7. Run local apps
```bash
npm install
npm run dev:web
npm run dev:mobile
```

## 8. Quick smoke test
- Sign into web with an account that has `admin: true`
- Open mobile app
- Enter customer name
- Send text
- Send image
- Confirm both appear on web in realtime
- Reply from web and verify mobile receives it
