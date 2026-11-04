import {initializeApp, getApps, type FirebaseApp} from 'firebase/app';
import {getAuth, type Auth} from 'firebase/auth';
import {getFirestore, type Firestore} from 'firebase/firestore';
import {getStorage, type FirebaseStorage} from 'firebase/storage';

// The Firebase WEB config is public client configuration, not a secret or admin credential.
// Ownlayer intentionally reuses the existing AI Engine Firebase project, while its datasets
// and files have their own namespaces. Never deploy onto the existing default Hosting site.
const existingProject = {
  apiKey: 'AIzaSyDrO4rWxy6BazFn2La6ACeQoK7If5Nz6gQ',
  authDomain: 'ai-engine-8ab26.firebaseapp.com',
  projectId: 'ai-engine-8ab26',
  storageBucket: 'ai-engine-8ab26.firebasestorage.app',
  appId: '1:259052717336:web:397ef26717bcf9ad74ca6d'
};
const settings = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || existingProject.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || existingProject.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || existingProject.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || existingProject.storageBucket,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || existingProject.appId
};
export const configured = Object.values(settings).every(Boolean);
export const app: FirebaseApp|null = configured ? (getApps()[0] || initializeApp(settings)) : null;
export const auth: Auth|null = app ? getAuth(app) : null;
export const db: Firestore|null = app ? getFirestore(app) : null;
export const storage: FirebaseStorage|null = app ? getStorage(app) : null;
