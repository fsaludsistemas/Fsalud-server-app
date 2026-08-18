import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || 'AIzaSyBpGGPRN-fA-raJH8vItq0u2gncr6AJaow',
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'fsalud-server.firebaseapp.com',
  projectId: process.env.FIREBASE_PROJECT_ID || 'fsalud-server',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'fsalud-server.firebasestorage.app',
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '837433448446',
  appId: process.env.FIREBASE_APP_ID || '1:837433448446:web:f2c391999381aa2abf52af'
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

export { db };