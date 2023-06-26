import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {}; // FIREBASE CONFIG HERE

const _app = initializeApp(firebaseConfig);
export const db = getFirestore(_app);
export const auth = getAuth(_app);
export const app = _app;
