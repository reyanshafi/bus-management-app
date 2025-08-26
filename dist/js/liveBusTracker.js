// Live Bus Tracking Module
// This integrates with the GPS tracking system

import { db } from './firebaseConfig.js';
import { doc, collection, onSnapshot, query, where, orderBy } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

class LiveBusTracker {
  constructor() {
    this.map = null;
    this.busMarkers = new Map();
    this.currentStudent = null;
    this.studentBusId = null;
    this.trackingInterval = null;
    this.isTracking = false;
  }

  // Initialize the live tracking system
  async init(studentData) {
    console.log('🚀 LiveBusTracker init called with:', {
      studentData: studentData,
      assignedBus: studentData.assignedBus
    });
    
    this.currentStudent = studentData;
    this.studentBusId = studentData.assignedBus;
    
    if (!this.studentBusId) {
      console.error('❌ No assigned bus found for student:', studentData);
      this.showNoLocationMessage();
      return;
    }
    
    // Initialize map
    await this.initializeMap();
    
    // Start real-time tracking
    this.startTracking();
    
    console.log(`✅ Live tracking initialized for bus: ${this.studentBusId}`);
  }

  // Initialize Google Maps or alternative map service
  async initializeMap() {
    const mapContainer = document.getElementById('busTrackingMap');
    
    if (!mapContainer) {
      console.error('Map container not found');
      return;
    }

    // For now, we'll use a simple map placeholder
    // You can replace this with Google Maps, Leaflet, or another map service
    mapContainer.innerHTML = `
      <div id="mapCanvas" class="w-full h-full bg-blue-50 rounded-xl border border-blue-200 relative overflow-hidden">
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="text-center">
            <div id="mapLoader" class="flex justify-center mb-4">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
            <p class="text-gray-600">Loading bus location...</p>
          </div>
        </div>
        <div id="busMarker" class="absolute hidden">
          <div class="bg-red-500 text-white p-2 rounded-full shadow-lg">
            <i class="fas fa-bus"></i>
          </div>
        </div>
      </div>
    `;

    console.log('🗺️ Map initialized');
  }

  // Start real-time bus tracking
  startTracking() {
    if (this.isTracking || !this.studentBusId) {
      console.error('❌ Cannot start tracking:', {
        isTracking: this.isTracking,
        studentBusId: this.studentBusId
      });
      return;
    }

    this.isTracking = true;
    console.log(`📍 Starting real-time tracking for bus: ${this.studentBusId}`);

    // Listen to real-time location updates
    const busLocationRef = doc(db, 'busLocations', this.studentBusId);
    console.log('👂 Setting up Firebase listener for:', `busLocations/${this.studentBusId}`);
    
    this.locationUnsubscribe = onSnapshot(busLocationRef, (doc) => {
      console.log('📡 Firebase update received:', {
        exists: doc.exists(),
        data: doc.exists() ? doc.data() : null,
        busId: this.studentBusId
      });
      
      if (doc.exists()) {
        const locationData = doc.data();
        this.updateBusLocation(locationData);
      } else {
        console.warn('⚠️ No location data found for bus:', this.studentBusId);
        this.showNoLocationMessage();
      }
    }, (error) => {
      console.error('❌ Error listening to bus location:', error);
      this.showErrorMessage('Failed to get live location updates');
    });

    // Also get bus details
    this.getBusDetails();
  }

  // Stop tracking
  stopTracking() {
    if (this.locationUnsubscribe) {
      this.locationUnsubscribe();
    }
    this.isTracking = false;
    console.log('📍 Live tracking stopped');
  }

  // Update bus location on the map
  updateBusLocation(locationData) {
    const { latitude, longitude, speed, course, satellites, lastUpdate, status } = locationData;
    
    console.log('📍 Bus location update:', locationData);

    // Update map marker position
    this.updateMapMarker(latitude, longitude, course);
    
    // Update location info panel
    this.updateLocationInfo({
      latitude,
      longitude,
      speed: speed || 0,
      course: course || 0,
      satellites: satellites || 0,
      lastUpdate: lastUpdate || new Date().toISOString(),
      status: status || 'active'
    });

    // Hide loader
    const loader = document.getElementById('mapLoader');
    if (loader) loader.style.display = 'none';
  }

  // Update map marker position
  updateMapMarker(lat, lng, course = 0) {
    const mapCanvas = document.getElementById('mapCanvas');
    const marker = document.getElementById('busMarker');
    
    if (!mapCanvas || !marker) return;

    // Simple coordinate to pixel conversion (for demo)
    // In real implementation, use proper map projection
    const mapRect = mapCanvas.getBoundingClientRect();
    const x = (lng + 180) * (mapRect.width / 360);
    const y = (90 - lat) * (mapRect.height / 180);

    // Position marker
    marker.style.left = `${Math.max(0, Math.min(mapRect.width - 40, x))}px`;
    marker.style.top = `${Math.max(0, Math.min(mapRect.height - 40, y))}px`;
    marker.style.transform = `rotate(${course}deg)`;
    marker.classList.remove('hidden');

    // Add pulse animation for active bus
    marker.classList.add('animate-pulse');
    setTimeout(() => marker.classList.remove('animate-pulse'), 2000);
  }

  // Update location information panel
  updateLocationInfo(locationData) {
    const { latitude, longitude, speed, course, satellites, lastUpdate, status } = locationData;
    
    // Update bus info card
    const busInfoCard = document.getElementById('busInfoCard');
    const lastUpdateTime = new Date(lastUpdate).toLocaleTimeString();
    
    if (busInfoCard) {
      busInfoCard.innerHTML = `
        <div class="flex items-center gap-6">
          <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center relative">
            <i class="fas fa-bus text-green-600 text-3xl"></i>
            <div class="absolute -top-1 -right-1 w-4 h-4 bg-${status === 'active' ? 'green' : 'red'}-500 rounded-full border-2 border-white"></div>
          </div>
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-green-700 mb-1">Bus #${this.studentBusId}</h3>
            <div class="space-y-1 text-sm">
              <p class="text-gray-700">
                <i class="fas fa-map-marker-alt mr-2"></i>
                Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}
              </p>
              <p class="text-gray-700">
                <i class="fas fa-tachometer-alt mr-2"></i>
                Speed: ${speed.toFixed(1)} km/h
              </p>
              <p class="text-gray-700">
                <i class="fas fa-satellite mr-2"></i>
                Satellites: ${satellites}
              </p>
              <p class="text-gray-500 text-xs">
                <i class="fas fa-clock mr-2"></i>
                Last updated: ${lastUpdateTime}
              </p>
            </div>
          </div>
          <div class="text-right">
            <div class="text-xs px-2 py-1 rounded-full ${status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
              ${status === 'active' ? '🟢 Live' : '🔴 Offline'}
            </div>
            <a href="https://maps.google.com/?q=${latitude},${longitude}" target="_blank" 
               class="text-blue-500 hover:text-blue-700 text-xs mt-1 inline-block">
              <i class="fas fa-external-link-alt mr-1"></i>Open in Maps
            </a>
          </div>
        </div>
      `;
    }
  }

  // Get additional bus details
  async getBusDetails() {
    if (!this.studentBusId) return;

    try {
      const busRef = doc(db, 'buses', this.studentBusId);
      const busUnsubscribe = onSnapshot(busRef, (doc) => {
        if (doc.exists()) {
          const busData = doc.data();
          this.updateBusDetailsDisplay(busData);
        }
      });

      this.busUnsubscribe = busUnsubscribe;
    } catch (error) {
      console.error('Error getting bus details:', error);
    }
  }

  // Update bus details display
  updateBusDetailsDisplay(busData) {
    const busDetailsContainer = document.getElementById('busDetails');
    if (!busDetailsContainer) return;

    busDetailsContainer.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div class="bg-blue-50 p-4 rounded-lg">
          <h4 class="font-semibold text-blue-700 mb-2">Route Information</h4>
          <p class="text-sm text-gray-700">Route: ${busData.route || 'Not assigned'}</p>
          <p class="text-sm text-gray-700">Driver: ${busData.driver || 'Not assigned'}</p>
        </div>
        <div class="bg-green-50 p-4 rounded-lg">
          <h4 class="font-semibold text-green-700 mb-2">Bus Details</h4>
          <p class="text-sm text-gray-700">Capacity: ${busData.seatsTotal || 'N/A'} seats</p>
          <p class="text-sm text-gray-700">Model: ${busData.model || 'N/A'}</p>
        </div>
      </div>
    `;
  }

  // Show message when no location data is available
  showNoLocationMessage() {
    const mapCanvas = document.getElementById('mapCanvas');
    if (mapCanvas) {
      mapCanvas.innerHTML = `
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="text-center">
            <i class="fas fa-map-marker-slash text-gray-400 text-4xl mb-4"></i>
            <p class="text-gray-600 mb-2">Bus location not available</p>
            <p class="text-gray-500 text-sm">GPS tracking may be offline</p>
          </div>
        </div>
      `;
    }

    const busInfoCard = document.getElementById('busInfoCard');
    if (busInfoCard) {
      busInfoCard.innerHTML = `
        <div class="flex items-center gap-6">
          <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
            <i class="fas fa-bus text-gray-400 text-3xl"></i>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-700 mb-1">Bus #${this.studentBusId}</h3>
            <p class="text-gray-500">Location data not available</p>
            <p class="text-gray-400 text-sm">GPS tracking offline</p>
          </div>
        </div>
      `;
    }
  }

  // Show error message
  showErrorMessage(message) {
    const mapCanvas = document.getElementById('mapCanvas');
    if (mapCanvas) {
      mapCanvas.innerHTML = `
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="text-center">
            <i class="fas fa-exclamation-triangle text-red-400 text-4xl mb-4"></i>
            <p class="text-red-600 mb-2">Error loading location</p>
            <p class="text-red-500 text-sm">${message}</p>
            <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
              Retry
            </button>
          </div>
        </div>
      `;
    }
  }

  // Cleanup when component is destroyed
  destroy() {
    this.stopTracking();
    if (this.busUnsubscribe) {
      this.busUnsubscribe();
    }
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
    }
  }
}

// Export the class
export default LiveBusTracker;
