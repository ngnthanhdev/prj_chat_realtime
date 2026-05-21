import {
  getAuth,
  getIdTokenResult,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import { firebaseApp } from './firebase';

const auth = getAuth(firebaseApp);
const provider = new GoogleAuthProvider();

export { auth };

export async function signInAdmin() {
  return signInWithPopup(auth, provider);
}

export async function signOutAdmin() {
  return signOut(auth);
}

export async function hasAdminClaim(user: User) {
  const token = await getIdTokenResult(user, true);
  return token.claims.admin === true;
}
