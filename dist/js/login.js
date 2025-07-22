// js/login.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { firebaseConfig } from './firebaseConfig.js';
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Login mode toggle logic
let loginMode = 'admin'; // default
const adminToggle = document.getElementById('adminToggle');
const studentToggle = document.getElementById('studentToggle');

function updateToggleUI() {
  if (loginMode === 'admin') {
    adminToggle.classList.add('bg-blue-600', 'text-white');
    adminToggle.classList.remove('bg-gray-200', 'text-gray-700');
    studentToggle.classList.remove('bg-blue-600', 'text-white');
    studentToggle.classList.add('bg-gray-200', 'text-gray-700');
  } else {
    studentToggle.classList.add('bg-blue-600', 'text-white');
    studentToggle.classList.remove('bg-gray-200', 'text-gray-700');
    adminToggle.classList.remove('bg-blue-600', 'text-white');
    adminToggle.classList.add('bg-gray-200', 'text-gray-700');
  }
}

adminToggle.addEventListener('click', () => {
  loginMode = 'admin';
  updateToggleUI();
});
studentToggle.addEventListener('click', () => {
  loginMode = 'student';
  updateToggleUI();
});
updateToggleUI();

// Handle login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  const errorMsg = document.getElementById('errorMsg');
  errorMsg.textContent = '';

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    // Fetch user from the correct collection
    let userRef, userSnap;
    if (loginMode === 'admin') {
      userRef = doc(db, 'users', uid);
      userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        window.location.href = 'admin.html';
      } else {
        errorMsg.textContent = 'Admin not found.';
      }
    } else {
      userRef = doc(db, 'students', uid);
      userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        window.location.href = 'student.html';
      } else {
        errorMsg.textContent = 'Student not found.';
      }
    }
  } catch (error) {
    errorMsg.textContent = error.message;
  }
});
