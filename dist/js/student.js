// student.js - Student Portal Navigation and Structure

// --- Firebase Initialization ---
import { firebaseConfig } from './firebaseConfig.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
initializeApp(firebaseConfig);

// --- Firebase Auth: Set window.currentUser automatically ---
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, getDocs, getDoc, doc, query, where, orderBy, limit, onSnapshot, updateDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
const auth = getAuth();
const db = getFirestore(); // Initialize Firestore
onAuthStateChanged(auth, (user) => {
  window.currentUser = user || null;
  // If dashboard is visible, refresh it
  const dashboardSection = document.getElementById('dashboardSection');
  if (dashboardSection && dashboardSection.classList.contains('active')) {
    loadDashboard();
  }
});

// Sidebar navigation logic
function showSection(sectionName) {
  // Hide all sections
  document.querySelectorAll('.section-content').forEach(section => {
    section.classList.remove('active');
  });
  // Remove active class from all nav links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
  });
  // Show the selected section
  const targetSection = document.getElementById(sectionName + 'Section');
  if (targetSection) {
    targetSection.classList.add('active');
  }
  // Set active nav link
  const activeLink = document.querySelector(`[href="#${sectionName}"]`);
  if (activeLink) {
    activeLink.classList.add('active');
  }
  // Update section title
  const titles = {
    dashboard: 'Dashboard',
    map: 'Live Map',
    transport: 'Transport',
    profile: 'Profile',
    feedback: 'Feedback',
    notifications: 'Notifications'
  };
  const titleElement = document.getElementById('sectionTitle');
  if (titleElement && titles[sectionName]) {
    titleElement.textContent = titles[sectionName];
  }
  // Close mobile sidebar if open
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    sidebar.classList.remove('active');
  }

  // --- Dashboard Data Logic ---
  if (sectionName === 'dashboard') {
    loadDashboard();
  }
  // --- Transport Data Logic ---
  if (sectionName === 'transport') {
    loadTransport();
  }
  // --- Profile Data Logic ---
  if (sectionName === 'profile') {
    loadProfile();
  }
  // --- Feedback Data Logic ---
  if (sectionName === 'feedback') {
    loadFeedback();
  }
  // --- Notifications Data Logic ---
  if (sectionName === 'notifications') {
    loadNotifications();
  }
}

// Setup navigation event listeners
function setupNavigation() {
  // Sidebar nav links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const section = this.getAttribute('href').substring(1);
      showSection(section);
    });
  });
  // Mobile menu button
  const mobileMenuButton = document.getElementById('mobileMenuButton');
  if (mobileMenuButton) {
    mobileMenuButton.addEventListener('click', function() {
      document.querySelector('.sidebar').classList.toggle('active');
    });
  }
  // Logout button (real logic)
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async function(e) {
      e.preventDefault();
      try {
        await signOut(auth);
        window.location.href = 'login.html';
      } catch (error) {
        alert('Logout failed: ' + error.message);
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', function() {
  setupNavigation();
  showSection('dashboard'); // Default section
});

// Placeholder functions for each section (to be implemented)
async function loadDashboard() {
  // Show loading states
  document.getElementById('assignedBusCard').textContent = 'Loading...';
  document.getElementById('nextStopCard').textContent = 'Loading...';
  document.getElementById('etaCard').textContent = 'Loading...';
  document.getElementById('busStatusCard').textContent = 'Loading...';
  const dashboardNotifications = document.getElementById('dashboardNotifications');
  dashboardNotifications.innerHTML = `<div class="p-3 text-center text-gray-500"><i class="fas fa-spinner fa-spin"></i> Loading announcements...</div>`;

  try {
    // Get current user
    const user = window.currentUser || null;
    if (!user) {
      document.getElementById('assignedBusCard').textContent = 'Not logged in';
      document.getElementById('nextStopCard').textContent = '-';
      document.getElementById('etaCard').textContent = '-';
      document.getElementById('busStatusCard').textContent = '-';
      dashboardNotifications.innerHTML = '<div class="p-3 text-center text-red-500">Not logged in</div>';
      return;
    }
    // Always load recent feedback for dashboard
    loadRecentFeedbackByEmail(user.email);
    // Fetch student document for assigned bus
    const studentDoc = await getDoc(doc(db, 'students', user.uid));
    if (!studentDoc.exists()) {
      document.getElementById('assignedBusCard').textContent = 'No bus assigned';
      document.getElementById('nextStopCard').textContent = '-';
      document.getElementById('etaCard').textContent = '-';
      document.getElementById('busStatusCard').textContent = '-';
      return;
    }
    const studentData = studentDoc.data();
    const assignedBusId = studentData.assignedBus;
    if (!assignedBusId) {
      document.getElementById('assignedBusCard').textContent = 'No bus assigned';
      document.getElementById('nextStopCard').textContent = '-';
      document.getElementById('etaCard').textContent = '-';
      document.getElementById('busStatusCard').textContent = '-';
      return;
    }
    // Real-time updates for assigned bus
    const unsubBus = onSnapshot(doc(db, 'buses', assignedBusId), async (busDoc) => {
      if (!busDoc.exists()) {
        document.getElementById('assignedBusCard').textContent = 'Bus not found';
        document.getElementById('nextStopCard').textContent = '-';
        document.getElementById('etaCard').textContent = '-';
        document.getElementById('busStatusCard').textContent = '-';
        return;
      }
      const bus = busDoc.data();
      // Fetch route info
      let routeName = '-';
      let nextStop = '-';
      let eta = bus.departure || '-';
      let stopsArr = [];
      if (bus.route) {
        const routeDoc = await getDoc(doc(db, 'routes', bus.route));
        if (routeDoc.exists()) {
          const route = routeDoc.data();
          routeName = route.name || '-';
          stopsArr = Array.isArray(route.stops) ? route.stops : [];
        }
      }
      // Fetch first stop name as next stop
      let stopName = '-';
      if (stopsArr.length > 0) {
        const stopDoc = await getDoc(doc(db, 'stops', stopsArr[0]));
        if (stopDoc.exists()) stopName = stopDoc.data().stopName || '-';
      }
      document.getElementById('assignedBusCard').textContent = `Bus No ${bus.busNumber} (${routeName})`;
      document.getElementById('nextStopCard').textContent = stopName;
      document.getElementById('etaCard').textContent = eta;
      document.getElementById('busStatusCard').textContent = 'Scheduled';
    });
    // Real-time notifications (announcements)
    // Listen for notifications sent to all, to this bus, or to this student
    const notificationsQuery = query(
      collection(db, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    const unsubNotif = onSnapshot(notificationsQuery, (snapshot) => {
      let html = '';
      let count = 0;
      snapshot.forEach(docSnap => {
        if (count >= 2) return; // Only show 2
        const n = docSnap.data();
        // Show if: recipientType is 'all', or 'bus' and matches assignedBusId, or 'student' and matches user.uid
        if (
          n.recipientType === 'all' ||
          (n.recipientType === 'bus' && n.recipientId === assignedBusId) ||
          (n.recipientType === 'student' && n.recipientId === user.uid)
        ) {
          const date = n.createdAt && n.createdAt.toDate ? n.createdAt.toDate().toLocaleString() : 'Unknown date';
          html += `<div class="bg-blue-50 p-4 rounded shadow mb-2"><div class="flex items-start space-x-3"><div class="p-2 bg-blue-100 rounded-full"><i class="fas fa-bullhorn text-blue-600"></i></div><div class="flex-1"><h3 class="font-semibold text-gray-900">${n.title || 'Announcement'}</h3><p class="text-gray-700 mt-1">${n.message || ''}</p><p class="text-xs text-gray-500 mt-2">${date}</p></div></div></div>`;
          count++;
        }
      });
      if (!html) {
        dashboardNotifications.innerHTML = '<div class="p-3 text-center text-gray-500">No announcements</div>';
      } else {
        dashboardNotifications.innerHTML = html;
      }
    });
    // --- Add this function for live bus occupancy calculation ---
    loadBusOccupancy(assignedBusId);
  } catch (error) {
    document.getElementById('assignedBusCard').textContent = 'Error';
    document.getElementById('nextStopCard').textContent = 'Error';
    document.getElementById('etaCard').textContent = 'Error';
    document.getElementById('busStatusCard').textContent = 'Error';
    dashboardNotifications.innerHTML = `<div class="p-3 text-center text-red-500">Failed to load: ${error.message}</div>`;
  }
}

async function loadTransport() {
  const msg = document.getElementById('transportMsg');
  const busDetails = document.getElementById('transportBusDetails');
  const routeList = document.getElementById('transportRouteList');
  const scheduleList = document.getElementById('transportScheduleList');
  msg.textContent = '';
  busDetails.innerHTML = '<div class="text-center text-gray-500">Loading...</div>';
  routeList.innerHTML = '';
  scheduleList.innerHTML = '';

  try {
    const user = window.currentUser || null;
    if (!user) {
      msg.textContent = 'Not logged in.';
      busDetails.innerHTML = '';
      return;
    }
    // Fetch student document for assigned bus
    const studentDoc = await getDoc(doc(db, 'students', user.uid));
    if (!studentDoc.exists()) {
      msg.textContent = 'Student record not found.';
      busDetails.innerHTML = '';
      return;
    }
    const studentData = studentDoc.data();
    const assignedBusId = studentData.assignedBus;
    if (!assignedBusId) {
      msg.textContent = 'No bus assigned.';
      busDetails.innerHTML = '';
      return;
    }
    // Real-time updates for assigned bus
    onSnapshot(doc(db, 'buses', assignedBusId), async (busDoc) => {
      if (!busDoc.exists()) {
        msg.textContent = 'Bus not found.';
        busDetails.innerHTML = '';
        routeList.innerHTML = '';
        scheduleList.innerHTML = '';
        return;
      }
      const bus = busDoc.data();
      // Fetch route info
      let routeName = '-';
      let stopsArr = [];
      let totalSeats = bus.seatsTotal || '-';
      let availableSeats = '-';
      if (bus.route) {
        const routeDoc = await getDoc(doc(db, 'routes', bus.route));
        if (routeDoc.exists()) {
          const route = routeDoc.data();
          routeName = route.name || '-';
          stopsArr = Array.isArray(route.stops) ? route.stops : [];
        }
      }
      // Calculate available seats
      const studentsSnap = await getDocs(collection(db, 'students'));
      let assignedCount = 0;
      studentsSnap.forEach(snap => {
        const s = snap.data();
        if (s.assignedBus === assignedBusId) assignedCount++;
      });
      availableSeats = totalSeats !== '-' ? (totalSeats - assignedCount) : '-';
      // Bus details
      busDetails.innerHTML = `
        <div class="mb-2"><b>Bus Number:</b> ${bus.busNumber || '-'}</div>
        <div class="mb-2"><b>Route:</b> ${routeName}</div>
        <div class="mb-2"><b>Departure Time:</b> ${bus.departure || '-'}</div>
        <div class="mb-2"><b>Total Seats:</b> ${totalSeats}</div>
        <div class="mb-2"><b>Available Seats:</b> ${availableSeats}</div>
      `;
      // Route stops
      routeList.innerHTML = '';
      for (let i = 0; i < stopsArr.length; i++) {
        const stopId = stopsArr[i];
        const stopDoc = await getDoc(doc(db, 'stops', stopId));
        let stopName = stopDoc.exists() ? stopDoc.data().stopName : 'Unknown Stop';
        routeList.innerHTML += `<li>${stopName}</li>`;
      }
      // Schedule (departure + stops)
      scheduleList.innerHTML = '';
      scheduleList.innerHTML += `<li><b>Departure:</b> ${bus.departure || '-'}</li>`;
      for (let i = 0; i < stopsArr.length; i++) {
        const stopId = stopsArr[i];
        const stopDoc = await getDoc(doc(db, 'stops', stopId));
        let stopName = stopDoc.exists() ? stopDoc.data().stopName : 'Unknown Stop';
        scheduleList.innerHTML += `<li>${stopName}</li>`;
      }
    });
  } catch (error) {
    msg.textContent = 'Failed to load transport info.';
    busDetails.innerHTML = '';
    routeList.innerHTML = '';
    scheduleList.innerHTML = '';
  }
}
function loadLiveMap() { /* ... */ }

async function loadProfile() {
  const msg = document.getElementById('profileMsg');
  const nameInput = document.getElementById('profileNameInput');
  const emailInput = document.getElementById('profileEmailInput');
  const phoneInput = document.getElementById('profilePhoneInput');
  const busInput = document.getElementById('profileBusInput');
  const regDateInput = document.getElementById('profileRegDateInput');
  const picPreview = document.getElementById('profilePicPreview');
  msg.textContent = '';
  nameInput.value = '';
  emailInput.value = '';
  phoneInput.value = '';
  busInput.value = '';
  regDateInput.value = '';
  picPreview.src = 'https://placehold.co/80x80?text=Photo';

  try {
    const user = window.currentUser || null;
    if (!user) {
      msg.textContent = 'Not logged in.';
      return;
    }
    // Fetch student document
    const studentDoc = await getDoc(doc(db, 'students', user.uid));
    if (!studentDoc.exists()) {
      msg.textContent = 'Student record not found.';
      return;
    }
    const data = studentDoc.data();
    nameInput.value = data.name || '';
    emailInput.value = data.email || user.email;
    phoneInput.value = data.phone || '';
    busInput.value = data.assignedBus || '-';
    regDateInput.value = data.createdAt && data.createdAt.toDate ? data.createdAt.toDate().toLocaleString() : '-';
    if (data.profilePicUrl) {
      picPreview.src = data.profilePicUrl;
    }
    // Fetch bus and route name for display
    if (data.assignedBus) {
      const busDoc = await getDoc(doc(db, 'buses', data.assignedBus));
      if (busDoc.exists()) {
        const bus = busDoc.data();
        let routeName = '-';
        if (bus.route) {
          const routeDoc = await getDoc(doc(db, 'routes', bus.route));
          if (routeDoc.exists()) routeName = routeDoc.data().name || '-';
        }
        busInput.value = `Bus No ${bus.busNumber} (${routeName})`;
      }
    }
  } catch (error) {
    msg.textContent = 'Failed to load profile.';
  }
}

// Save profile changes
const profileSaveBtn = document.getElementById('profileSaveBtn');
if (profileSaveBtn) {
  profileSaveBtn.onclick = async function() {
    const msg = document.getElementById('profileMsg');
    const name = document.getElementById('profileNameInput').value.trim();
    const phone = document.getElementById('profilePhoneInput').value.trim();
    msg.textContent = '';
    if (!name) {
      msg.textContent = 'Name is required.';
      return;
    }
    try {
      const user = window.currentUser || null;
      if (!user) throw new Error('Not logged in.');
      await updateDoc(doc(db, 'students', user.uid), { name, phone });
      msg.textContent = 'Profile updated!';
      setTimeout(() => { msg.textContent = ''; }, 2000);
    } catch (error) {
      msg.textContent = 'Failed to update profile.';
    }
  };
}

// Profile picture upload
const profilePicInput = document.getElementById('profilePicInput');
if (profilePicInput) {
  profilePicInput.onchange = async function(e) {
    const file = e.target.files[0];
    const msg = document.getElementById('profileMsg');
    if (!file) return;
    try {
      const user = window.currentUser || null;
      if (!user) throw new Error('Not logged in.');
      const storage = getStorage();
      const fileRef = storageRef(storage, `profilePics/${user.uid}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      console.log('Uploading profile pic, URL:', url); // LOG URL
      await updateDoc(doc(db, 'students', user.uid), { profilePicUrl: url });
      document.getElementById('profilePicPreview').src = url;
      msg.textContent = 'Profile picture updated!';
      setTimeout(() => { msg.textContent = ''; }, 2000);
    } catch (error) {
      msg.textContent = 'Failed to upload profile picture.';
      console.error('Profile pic upload error:', error); // LOG ERROR
    }
  };
}

// Password change logic
const profilePasswordForm = document.getElementById('profilePasswordForm');
if (profilePasswordForm) {
  profilePasswordForm.onsubmit = async function(e) {
    e.preventDefault();
    const msg = document.getElementById('profilePasswordMsg');
    msg.textContent = '';
    const oldPass = document.getElementById('profileOldPassword').value;
    const newPass = document.getElementById('profileNewPassword').value;
    const confirmPass = document.getElementById('profileConfirmPassword').value;
    if (!oldPass || !newPass || !confirmPass) {
      msg.textContent = 'All fields are required.';
      return;
    }
    if (newPass !== confirmPass) {
      msg.textContent = 'New passwords do not match.';
      return;
    }
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not logged in.');
      // Re-authenticate
      const cred = firebase.auth.EmailAuthProvider.credential(user.email, oldPass);
      await auth.currentUser.reauthenticateWithCredential(cred);
      await auth.currentUser.updatePassword(newPass);
      msg.textContent = 'Password changed successfully!';
      profilePasswordForm.reset();
      setTimeout(() => { msg.textContent = ''; }, 2000);
    } catch (error) {
      msg.textContent = 'Failed to change password: ' + (error.message || error);
    }
  };
}

async function loadFeedback() {
  const feedbackList = document.getElementById('feedbackList');
  const user = window.currentUser || null;
  feedbackList.innerHTML = '<div class="text-center text-gray-500">Loading...</div>';
  if (!user) {
    feedbackList.innerHTML = '<div class="text-center text-red-500">Not logged in.</div>';
    return;
  }
  // Real-time listener for student's feedback
  const q = query(collection(db, 'feedback'), where('uid', '==', user.uid), orderBy('createdAt', 'desc'));
  onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      feedbackList.innerHTML = '<div class="text-center text-gray-500">No feedback yet.</div>';
      return;
    }
    let html = '';
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const date = data.createdAt && data.createdAt.toDate ? data.createdAt.toDate().toLocaleString() : '-';
      html += `<div class="bg-blue-50 border border-blue-100 rounded-lg p-4 shadow-sm">
        <div class="flex justify-between items-center mb-2">
          <div class="font-semibold text-gray-800">${data.title || 'Feedback'}</div>
          <div class="text-xs text-gray-500">${date}</div>
        </div>
        <div class="text-gray-700 mb-2">${data.message}</div>
        ${data.reply ? `<div class='bg-green-50 border-l-4 border-green-400 p-2 rounded text-green-700 mt-2'><b>Admin Reply:</b> ${data.reply}</div>` : ''}
      </div>`;
    });
    feedbackList.innerHTML = html;
  });
}

// Feedback form submission
const feedbackForm = document.getElementById('feedbackForm');
if (feedbackForm) {
  feedbackForm.onsubmit = async function(e) {
    e.preventDefault();
    const user = window.currentUser || null;
    const msg = document.getElementById('feedbackFormMsg');
    msg.textContent = '';
    if (!user) {
      msg.textContent = 'Not logged in.';
      return;
    }
    const title = document.getElementById('feedbackTitle').value.trim();
    const message = document.getElementById('feedbackMsg').value.trim();
    if (!message) {
      msg.textContent = 'Message is required.';
      return;
    }
    try {
      await addDoc(collection(db, 'feedback'), {
        uid: user.uid,
        studentName: user.displayName || '',
        email: user.email,
        title,
        message,
        createdAt: new Date()
      });
      msg.textContent = 'Feedback submitted!';
      feedbackForm.reset();
      setTimeout(() => { msg.textContent = ''; }, 2000);
    } catch (error) {
      msg.textContent = 'Failed to submit feedback.';
    }
  };
}

async function loadNotifications() {
  const notificationsList = document.getElementById('notificationsList');
  const user = window.currentUser || null;
  notificationsList.innerHTML = '<div class="text-center text-gray-500">Loading...</div>';
  if (!user) {
    notificationsList.innerHTML = '<div class="text-center text-red-500">Not logged in.</div>';
    return;
  }
  // Fetch assigned bus for filtering
  let assignedBusId = null;
  try {
    const studentDoc = await getDoc(doc(db, 'students', user.uid));
    if (studentDoc.exists()) {
      assignedBusId = studentDoc.data().assignedBus || null;
    }
  } catch (e) {}
  // Real-time listener for relevant notifications
  const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(30));
  onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      notificationsList.innerHTML = '<div class="text-center text-gray-500">No notifications yet.</div>';
      return;
    }
    let html = '';
    snapshot.forEach(docSnap => {
      const n = docSnap.data();
      // Show if: all, or bus and matches assignedBusId, or student and matches user.uid
      let show = false;
      let tag = '';
      if (n.recipientType === 'all') {
        show = true;
        tag = '<span class="inline-block bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded ml-2">All</span>';
      } else if (n.recipientType === 'bus' && n.recipientId === assignedBusId) {
        show = true;
        tag = `<span class=\"inline-block bg-green-100 text-green-700 text-xs px-2 py-1 rounded ml-2\">Bus No ${n.busNumber || ''}</span>`;
      } else if (n.recipientType === 'student' && n.recipientId === user.uid) {
        show = true;
        tag = '<span class="inline-block bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded ml-2">You</span>';
      }
      if (show) {
        const date = n.createdAt && n.createdAt.toDate ? n.createdAt.toDate().toLocaleString() : '-';
        html += `<div class="bg-yellow-50 border border-yellow-100 rounded-lg p-4 shadow-sm">
          <div class="flex justify-between items-center mb-2">
            <div class="font-semibold text-gray-800">${n.title || 'Notification'} ${tag}</div>
            <div class="text-xs text-gray-500">${date}</div>
          </div>
          <div class="text-gray-700">${n.message}</div>
        </div>`;
      }
    });
    if (!html) {
      notificationsList.innerHTML = '<div class="text-center text-gray-500">No notifications yet.</div>';
    } else {
      notificationsList.innerHTML = html;
    }
  });
}

// --- Add this function for recent feedback by email ---
function loadRecentFeedbackByEmail(email) {
  console.log('Loading recent feedback for:', email);
  const q = query(
    collection(db, 'feedback'),
    where('email', '==', email),
    orderBy('createdAt', 'desc'),
    limit(3)
  );
  onSnapshot(q, snap => {
    const list = document.getElementById('recentFeedbackList');
    if (!list) return;
    console.log('Recent feedback snapshot size:', snap.size);
    if (snap.empty) {
      list.innerHTML = '<li class="text-gray-500">No feedback yet.</li>';
    } else {
      list.innerHTML = '';
      snap.forEach(doc => {
        const d = doc.data();
        console.log('Feedback doc:', d);
        list.innerHTML += `<li>
          <span class="font-semibold">${d.title || 'Feedback'}</span>
          <span class="text-gray-500 text-xs ml-2">${d.createdAt && d.createdAt.toDate ? new Date(d.createdAt.toDate()).toLocaleString() : '-'}</span>
          <div class="text-gray-700">${d.message}</div>
        </li>`;
      });
    }
  });
}

// --- Add this function for live bus occupancy calculation ---
function loadBusOccupancy(busId) {
  const busDocRef = doc(db, 'buses', busId);
  // Listen to bus doc for totalSeats
  onSnapshot(busDocRef, (busDoc) => {
    if (!busDoc.exists()) {
      document.getElementById('busOccupancyInfo').textContent = '-- / --';
      return;
    }
    const bus = busDoc.data();
    const totalSeats = bus.totalSeats || bus.seatsTotal || '-';
    if (totalSeats === '-') {
      document.getElementById('busOccupancyInfo').textContent = '-- / --';
      return;
    }
    // Listen to students assigned to this bus
    const studentsQuery = query(collection(db, 'students'), where('assignedBus', '==', busId));
    onSnapshot(studentsQuery, (snap) => {
      const assignedCount = snap.size;
      const availableSeats = totalSeats - assignedCount;
      document.getElementById('busOccupancyInfo').textContent = `${availableSeats} / ${totalSeats}`;
    });
  });
} 