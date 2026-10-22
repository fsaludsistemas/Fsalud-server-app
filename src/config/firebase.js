import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY ,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN ,
  projectId: process.env.FIREBASE_PROJECT_ID ,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET ,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID ,
  appId: process.env.FIREBASE_APP_ID 
};

const firebaseApp = initializeApp(firebaseConfig);
// Firestore se consume mediante la API REST en firestoreRest.js.
// Se conserva este export vacío para no romper imports existentes.
const db = {};
const storageBucket = firebaseConfig.storageBucket;

export { db, storageBucket };
