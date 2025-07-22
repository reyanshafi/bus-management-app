// Admin Dashboard - admin.js

//  Firebase SDK Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { firebaseConfig } from './firebaseConfig.js';
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

//  Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

//  Redirect if not logged in
onAuthStateChanged(auth, (user) => {
  if (!user) window.location.href = "login.html";
});

//  User Management (Direct)
const userForm = document.getElementById("addUserForm");
const userMsg = document.getElementById("formMsg");

userForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("newName").value.trim();
  const email = document.getElementById("newEmail").value.trim();
  const password = document.getElementById("newPassword").value.trim();
  const role = document.getElementById("newRole").value;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    await setDoc(doc(db, "users", uid), {
      uid,
      name,
      email,
      role,
      createdAt: new Date()
    });

    userMsg.textContent = "✅ User created and added to Firestore.";
    userForm.reset();
    loadStudents();
  } catch (error) {
    userMsg.textContent = `❌ ${error.message}`;
  }
});

// ✅ Bus Management
const busForm = document.getElementById("busForm");
const busList = document.getElementById("busList");

busForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const busNumber = document.getElementById("busNumber").value.trim();
  const route = document.getElementById("route").value.trim();
  const departure = document.getElementById("departure").value;
  const seatsTotal = parseInt(document.getElementById("seatsTotal").value);

  try {
    await addDoc(collection(db, "buses"), {
      busNumber,
      route,
      departure: new Date(departure),
      seatsTotal,
      seatsAvailable: seatsTotal
    });
    busForm.reset();
    fetchBuses();
  } catch (err) {
    alert("❌ " + err.message);
  }
});

async function fetchBuses() {
  if (!busList) return;
  busList.innerHTML = "<tr><td colspan='5' class='px-6 py-4 text-center text-gray-500'><i class='fas fa-spinner fa-spin'></i> Loading buses...</td></tr>";
  const snapshot = await getDocs(collection(db, "buses"));

  busList.innerHTML = '';
  if (snapshot.empty) {
    busList.innerHTML = "<tr><td colspan='5' class='px-6 py-4 text-center text-gray-500'>No buses found</td></tr>";
    return;
  }

  snapshot.forEach(docSnap => {
    const bus = docSnap.data();
    const id = docSnap.id;
    const row = document.createElement('tr');
    row.className = 'hover:bg-gray-50';
    row.innerHTML = `
      <td class="px-6 py-4 whitespace-nowrap">${bus.busNumber}</td>
      <td class="px-6 py-4">${bus.route}</td>
      <td class="px-6 py-4 whitespace-nowrap">${new Date(bus.departure).toLocaleString()}</td>
      <td class="px-6 py-4 whitespace-nowrap">
        <span class="px-2 py-1 text-xs rounded-full ${bus.seatsAvailable > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
          ${bus.seatsAvailable} / ${bus.seatsTotal}
        </span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <button class="text-indigo-600 hover:text-indigo-900 mr-2 editBus" data-id="${id}">Edit</button>
        <button class="text-red-600 hover:text-red-900 deleteBus" data-id="${id}">Delete</button>
      </td>
    `;
    busList.appendChild(row);
  });

  document.querySelectorAll('.editBus').forEach(btn => {
    btn.addEventListener('click', async () => {
      const newRoute = prompt("Enter new route:");
      const newSeats = prompt("Enter total seats:");
      if (newRoute && newSeats) {
        try {
          await updateDoc(doc(db, "buses", btn.dataset.id), {
            route: newRoute,
            seatsTotal: parseInt(newSeats),
            seatsAvailable: parseInt(newSeats)
          });
          fetchBuses();
        } catch (error) {
          alert('Error updating bus: ' + error.message);
        }
      }
    });
  });

  document.querySelectorAll('.deleteBus').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to delete this bus?')) {
        try {
          await deleteDoc(doc(db, "buses", btn.dataset.id));
          fetchBuses();
        } catch (error) {
          alert('Error deleting bus: ' + error.message);
        }
      }
    });
  });
}

// ✅ Bus Assignment
const assignForm = document.getElementById("assignForm");
const studentSelect = document.getElementById("studentSelect");
const busSelect = document.getElementById("busSelect");
const assignMsg = document.getElementById("assignMsg");

assignForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const studentId = studentSelect.value;
  const busId = busSelect.value;

  if (!studentId || !busId) {
    assignMsg.textContent = "❌ Select both student and bus.";
    return;
  }

  try {
    await setDoc(doc(db, "assigned_buses", studentId), {
      uid: studentId,
      busId,
      assignedAt: new Date()
    });
    assignMsg.textContent = "✅ Bus assigned successfully!";
    assignForm.reset();
  } catch (err) {
    assignMsg.textContent = `❌ ${err.message}`;
  }
});

async function loadStudents() {
  if (!studentSelect) return;
  studentSelect.innerHTML = `<option value="">Select Student</option>`;
  const snapshot = await getDocs(collection(db, "users"));

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    if (data.role === "student") {
      studentSelect.innerHTML += `<option value="${docSnap.id}">${data.name || data.email}</option>`;
    }
  });
}

async function loadBuses() {
  if (!busSelect) return;
  busSelect.innerHTML = `<option value="">Select Bus</option>`;
  const snapshot = await getDocs(collection(db, "buses"));

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    busSelect.innerHTML += `<option value="${docSnap.id}">${data.busNumber} (${data.route})</option>`;
  });
}

// Feedback Display
const feedbackList = document.getElementById("feedbackList");

async function loadFeedbacks() {
  if (!feedbackList) return;
  feedbackList.innerHTML = "";
  const snapshot = await getDocs(collection(db, "feedback"));

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const div = document.createElement("div");
    div.className = "bg-white p-4 rounded shadow mb-2";
    div.innerHTML = `
      <h3 class="font-bold">${data.title}</h3>
      <p>${data.message}</p>
      <p class="text-sm text-gray-500">By: ${data.email}</p>
      <p class="text-sm text-gray-400">Submitted: ${new Date(data.createdAt.toDate()).toLocaleString()}</p>
    `;
    feedbackList.appendChild(div);
  });
}

//  Notification Sender
const notifyForm = document.getElementById("notifyForm");
const notifyMsgStatus = document.getElementById("notifyMsgStatus");

notifyForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = document.getElementById("notifyTitle").value.trim();
  const message = document.getElementById("notifyMsg").value.trim();

  try {
    await addDoc(collection(db, "notifications"), {
      title,
      message,
      createdAt: new Date()
    });
    notifyForm.reset();
    notifyMsgStatus.textContent = "✅ Notification sent!";
  } catch (err) {
    notifyMsgStatus.textContent = `❌ ${err.message}`;
  }
});

//  Route Management
const routeForm = document.getElementById("routeForm");
const routeList = document.getElementById("routeList");

routeForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("routeName").value.trim();
  const desc = document.getElementById("routeDesc").value.trim();
  if (!name) return;

  try {
    await addDoc(collection(db, "routes"), {
      name,
      description: desc,
      createdAt: new Date()
    });
    routeForm.reset();
    loadRoutes();
    loadRoutesToSelect();
  } catch (err) {
    alert("❌ Failed to add route: " + err.message);
  }
});

async function loadRoutes() {
  if (!routeList) return;
  routeList.innerHTML = "<tr><td colspan='4' class='px-6 py-4 text-center text-gray-500'><i class='fas fa-spinner fa-spin'></i> Loading routes...</td></tr>";
  const snapshot = await getDocs(collection(db, "routes"));
  routeList.innerHTML = '';
  if (snapshot.empty) {
    routeList.innerHTML = "<tr><td colspan='4' class='px-6 py-4 text-center text-gray-500'>No routes found</td></tr>";
    return;
  }
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const row = document.createElement('tr');
    row.className = 'hover:bg-gray-50';
    row.innerHTML = `
      <td class="px-6 py-4 whitespace-nowrap font-medium">${data.name}</td>
      <td class="px-6 py-4">${data.description || '—'}</td>
      <td class="px-6 py-4 whitespace-nowrap">${new Date(data.createdAt.toDate()).toLocaleString()}</td>
      <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <button class="text-red-600 hover:text-red-900 deleteRoute" data-id="${docSnap.id}">Delete</button>
      </td>
    `;
    routeList.appendChild(row);
  });
  document.querySelectorAll('.deleteRoute').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to delete this route?')) {
        try {
          await deleteDoc(doc(db, "routes", btn.dataset.id));
          loadRoutes();
          loadRoutesToSelect();
        } catch (error) {
          alert('Error deleting route: ' + error.message);
        }
      }
    });
  });
}

//  Stop Management
const stopForm = document.getElementById("stopForm");
const routeSelect = document.getElementById("routeSelect");
const stopList = document.getElementById("stopList");

stopForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const routeId = routeSelect.value;
  const stopName = document.getElementById("stopName").value.trim();
  const stopTime = document.getElementById("stopTime").value;
  if (!routeId || !stopName || !stopTime) return;

  try {
    await addDoc(collection(db, "stops"), {
      routeId,
      stopName,
      stopTime
    });
    stopForm.reset();
    loadStops();
  } catch (err) {
    alert("❌ Failed to add stop: " + err.message);
  }
});

async function loadRoutesToSelect() {
  if (!routeSelect) return;
  routeSelect.innerHTML = `<option value="">Select Route</option>`;
  const snapshot = await getDocs(collection(db, "routes"));
  snapshot.forEach(docSnap => {
    const { name } = docSnap.data();
    routeSelect.innerHTML += `<option value="${docSnap.id}">${name}</option>`;
  });
}

async function loadStops() {
  if (!stopList) return;
  stopList.innerHTML = "";
  const [routeSnap, stopSnap] = await Promise.all([
    getDocs(collection(db, "routes")),
    getDocs(collection(db, "stops"))
  ]);

  const routeNames = {};
  routeSnap.forEach(doc => { routeNames[doc.id] = doc.data().name; });

  const stopsByRoute = {};
  stopSnap.forEach(doc => {
    const { routeId, stopName, stopTime } = doc.data();
    stopsByRoute[routeId] = stopsByRoute[routeId] || [];
    stopsByRoute[routeId].push({ id: doc.id, stopName, stopTime });
  });

  Object.entries(stopsByRoute).forEach(([rid, stops]) => {
    const wrapper = document.createElement("div");
    wrapper.className = "bg-white p-4 rounded shadow mb-4";
    wrapper.innerHTML = `<h3 class="font-bold">${routeNames[rid] || '—'}</h3>`;
    stops.forEach(s => {
      const div = document.createElement("div");
      div.className = "ml-4 flex justify-between items-center";
      div.innerHTML = `
        <span>${s.stopName} — ${s.stopTime}</span>
        <button class="bg-red-500 text-white px-2 py-1 rounded deleteStop" data-id="${s.id}">Delete</button>`;
      wrapper.appendChild(div);
    });
    stopList.appendChild(wrapper);
  });

  document.querySelectorAll(".deleteStop").forEach(btn => {
    btn.onclick = async () => {
      await deleteDoc(doc(db, "stops", btn.dataset.id));
      loadStops();
    };
  });
}

//  Init on Page Load
fetchBuses();
loadStudents();
loadBuses();
loadFeedbacks();
loadRoutes();
loadRoutesToSelect();
loadStops();
