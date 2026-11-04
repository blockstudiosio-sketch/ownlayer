import {initializeApp, getApps, type FirebaseApp} from 'firebase/app';
import {getAuth, type Auth} from 'firebase/auth';
import {getFirestore, type Firestore} from 'firebase/firestore';
import {getStorage, type FirebaseStorage} from 'firebase/storage';

const settings={
 apiKey:import.meta.env.VITE_FIREBASE_API_KEY as string|undefined,
 authDomain:import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string|undefined,
 projectId:import.meta.env.VITE_FIREBASE_PROJECT_ID as string|undefined,
 storageBucket:import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string|undefined,
 appId:import.meta.env.VITE_FIREBASE_APP_ID as string|undefined
};
export const configured=Object.values(settings).every(value=>!!value);
export const app: FirebaseApp|null=configured?(getApps()[0]||initializeApp(settings as Required<typeof settings>)):null;
export const auth:Auth|null=app?getAuth(app):null;
export const db:Firestore|null=app?getFirestore(app):null;
export const storage:FirebaseStorage|null=app?getStorage(app):null;
