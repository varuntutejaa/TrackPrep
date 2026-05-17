// import firebase modules 
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// firebase config
const firebaseConfig = {
  apiKey: "AIzaSyB4kCGUDFh_2p2bi16WUlUlKkOf9-DImqc",
  authDomain: "trackprep-64918.firebaseapp.com",
  projectId: "trackprep-64918",
  storageBucket: "trackprep-64918.firebasestorage.app",
  messagingSenderId: "262123563528",
  appId: "1:262123563528:web:0dacf7d2486dffa78affbd"
};

// initialize firebase
const app = initializeApp(firebaseConfig);

// export auth, db, and google provider for use in other modules
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// test firestore connection
async function testFirestore() {
  try {
    await addDoc(collection(db, "test"), {
      name: "Varun",
      time: Date.now()
    });
    console.log("SUCCESS");
  } catch (e) {
    console.error("ERROR:", e);
  }
}
testFirestore();