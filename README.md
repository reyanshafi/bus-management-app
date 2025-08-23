# Bus Management System

A web-based application for managing school or organizational bus fleets, routes, students, and feedback, built with Firebase, Firestore, and Chart.js.

## Features

- **Admin Dashboard:**
  - Real-time statistics (students, buses, routes, feedback)
  - Visual bar chart of students per bus
  - Recent activity and live notifications
  - Manage buses, routes, stops, students, and assignments
  - Send notifications to all, bus, or individual students
- **Student Dashboard:**
  - View assigned bus and route
  - Submit feedback
  - Receive notifications
- **Authentication:**
  - Separate login for Admin and Student
  - Firebase Authentication integration
- **Real-time Updates:**
  - All dashboards and lists update live using Firestore

## Project Structure

```
dist/
  admin.html         # Admin dashboard UI
  student.html       # Student dashboard UI
  login.html         # Login page for both roles
  js/
    login.js         # Login logic (role-based)
    firebaseConfig.js# Firebase config
    ...              # Other JS modules
firebase.json        # Firebase hosting config
```

## Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd bus-management-system
   ```
2. **Install dependencies:**
   - No build step required; uses CDN for Firebase and Chart.js.
3. **Configure Firebase:**
   - Create a Firebase project at https://console.firebase.google.com/
   - Enable Authentication (Email/Password)
   - Create Firestore Database
   - Copy your Firebase config to `dist/js/firebaseConfig.js`:
     ```js
     export const firebaseConfig = {
       apiKey: "...",
       authDomain: "...",
       projectId: "...",
       ...
     };
     ```
4. **Deploy (optional):**
   - Use Firebase Hosting:
     ```bash
     firebase init hosting
     firebase deploy
     ```

## Firestore Structure

- `users` (collection): Admin users
  - `{uid}`: { name, email, role: "admin", ... }
- `students` (collection): Student users
  - `{uid}`: { name, email, assignedBus, ... }
- `buses` (collection): Bus info
  - `{busId}`: { busNumber, route, seatsTotal, ... }
- `routes` (collection): Route info
  - `{routeId}`: { name, description, stops }
- `stops` (collection): Stop info
  - `{stopId}`: { stopName, location }
- `feedback` (collection): Student feedback
  - `{feedbackId}`: { studentName, email, message, createdAt }
- `notifications` (collection): Admin notifications
  - `{notificationId}`: { title, message, recipientType, ... }

## Adding Admins and Students

- **Via Firebase Console:**
  1. Add user in Authentication (email/password).
  2. Copy UID, add document in `users` (for admin) or `students` (for student) collection with that UID.
  3. Add fields: `name`, `email`, `role` (for admin: `admin`).

## Customization

- Update UI in `admin.html` and `student.html` as needed.
- Add more fields to Firestore documents for extra features.
- Adjust Firestore security rules for your needs.

## Security

- Restrict Firestore reads/writes using security rules.
- Only allow admins to write to `users`, `buses`, `routes`, etc.
- Only allow students to read their own data and submit feedback.

## License

MIT
