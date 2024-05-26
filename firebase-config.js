import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-analytics.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBK8dqn_CrWn7C4AuNO5FgkoE1NichbGIQ",
  authDomain: "songguessgame.firebaseapp.com",
  projectId: "songguessgame",
  storageBucket: "songguessgame.appspot.com",
  messagingSenderId: "579068737733",
  appId: "1:579068737733:web:cfc8c1d136205c510058ac",
  measurementId: "G-NREGZ768VS"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

export { db };