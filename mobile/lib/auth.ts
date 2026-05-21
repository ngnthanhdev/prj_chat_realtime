import { getApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';

const auth = getAuth(getApp());

export async function ensureAnonymousUser() {
  if (auth.currentUser) return auth.currentUser;
  const credential = await signInAnonymously(auth);
  return credential.user;
}
