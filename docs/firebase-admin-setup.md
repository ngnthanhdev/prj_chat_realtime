# Firebase Admin Setup

This project expects real admin users to be marked with a Firebase custom claim:

```json
{
  "admin": true
}
```

## Why
The web app can sign in with Google, but Firestore and Storage rules should only trust users whose token includes `admin: true`.

## How to assign admin claim
Use Firebase Admin SDK in a secure script or backend environment.

Example Node.js snippet:

```ts
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

initializeApp({
  // service account config here
});

await getAuth().setCustomUserClaims('FIREBASE_USER_UID', { admin: true });
```

After setting the claim, the user should sign out and sign in again so the token refreshes.

## Web UI behavior
The web admin UI now checks the ID token after sign-in. If the signed-in user does not have `admin: true`, the UI will block access and ask the user to contact the project owner.

## Minimum Firebase configuration
- Enable Google sign-in for web admins
- Enable Anonymous sign-in for mobile customers
- Deploy Firestore rules
- Deploy Storage rules

## Deploy commands
```bash
firebase deploy --only firestore:rules
firebase deploy --only storage
```
