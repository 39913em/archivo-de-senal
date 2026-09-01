// src/firebase-config.js
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyC42arLXTaQs_mdXEUyc58ge2SdZVKtm4A",
  authDomain: "archivo-senal-poesia-test.firebaseapp.com",
  databaseURL: "https://archivo-senal-poesia-test-default-rtdb.firebaseio.com",
  projectId: "archivo-senal-poesia-test",
  storageBucket: "archivo-senal-poesia-test.firebasestorage.app",
  messagingSenderId: "29695212671",
  appId: "1:29695212671:web:c29715d98992d770c0d34a"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export { db };