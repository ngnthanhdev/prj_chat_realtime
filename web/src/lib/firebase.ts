import { initializeApp, getApps, getApp } from 'firebase/app';
import { firebaseEnv } from './env';

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseEnv);
