// Import the functions you need from the SDKs you need

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { setLogLevel } from "firebase/firestore";


// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBGjoRRDjXLsmX-hxdQEKez4CxHkIbCcWU",
  authDomain: "steam-outlet-425507-t1.firebaseapp.com",
  projectId: "steam-outlet-425507-t1",
  storageBucket: "steam-outlet-425507-t1.firebasestorage.app",
  messagingSenderId: "925599253452",
  appId: "1:925599253452:web:d4abc6968b07bb95131369",
  measurementId: "G-3YPK4FWRH9"
};

// Initialize Firebase
// const app = initializeApp(firebaseConfig);
// const auth=getAuth(app)

// const provider=new GoogleAuthProvider();
// export {auth,provider};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);
const storage = getStorage(app); // Storage initialize chesam ra
setLogLevel('debug');

export { auth, provider, db, storage };

