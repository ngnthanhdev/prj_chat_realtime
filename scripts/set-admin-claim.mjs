import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import fs from 'node:fs';

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
const uid = process.env.FIREBASE_ADMIN_UID;

if (!serviceAccountPath || !uid) {
  console.error('Missing FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_ADMIN_UID');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

initializeApp({
  credential: cert(serviceAccount),
});

await getAuth().setCustomUserClaims(uid, { admin: true });
console.log(`Admin claim set for uid: ${uid}`);
