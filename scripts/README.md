# Scripts

## set-admin-claim.mjs
Assigns Firebase custom claim `admin: true` to a user.

### Usage
```bash
FIREBASE_SERVICE_ACCOUNT_PATH=/absolute/path/service-account.json \
FIREBASE_ADMIN_UID=<firebase-auth-uid> \
node scripts/set-admin-claim.mjs
```
