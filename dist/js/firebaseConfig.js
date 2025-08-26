import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyDfsDCX0LnmbnhduUpa_OzfeXapfcyRJng",
  authDomain: "bus-management-system-44771.firebaseapp.com",
  projectId: "bus-management-system-44771",
  storageBucket: "bus-management-system-44771.appspot.com",
  messagingSenderId: "245676169039",
  appId: "1:245676169039:web:902e94eca32d2ec762973a",
  measurementId: "G-SBBM9FC0Z0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore and export it
export const db = getFirestore(app); 