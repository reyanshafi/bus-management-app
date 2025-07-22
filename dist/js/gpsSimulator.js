import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Firebase init
const firebaseConfig = { /* your config */ };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Fake coordinates (you can loop over multiple buses)
const busId = "bus123"; // Replace with real Firestore ID

let lat = 34.0851;
let lng = 74.7961;

setInterval(async () => {
  lat += (Math.random() - 0.5) * 0.001;
  lng += (Math.random() - 0.5) * 0.001;

  await updateDoc(doc(db, "buses", busId), {
    location: { lat, lng }
  });

  console.log(`Updated: ${lat}, ${lng}`);
}, 5000);
