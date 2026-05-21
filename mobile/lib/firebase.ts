import { getApp, getApps, initializeApp } from 'firebase/app';
import { firebaseEnv } from './env';

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseEnv);
