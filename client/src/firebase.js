import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, set } from "firebase/database";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyABm3qFm9qnMxPkqGJXpOvE9yaj2dbsgJI",
  authDomain: "raghav-33ebc.firebaseapp.com",
  projectId: "raghav-33ebc",
  databaseURL: "https://raghav-33ebc-default-rtdb.firebaseio.com",
  storageBucket: "raghav-33ebc.firebasestorage.app",
  messagingSenderId: "60990550438",
  appId: "1:60990550438:web:b80f9e80e02c4248931f67",
  measurementId: "G-8W1ZFP2L0S"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const storage = getStorage(app);
export { ref, get, set, storageRef, uploadBytes, getDownloadURL };
