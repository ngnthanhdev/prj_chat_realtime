import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
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
