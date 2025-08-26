// Simple HTTP GPS Client for Student Portal
// Fetches GPS data directly from ESP8266 via HTTP

class SimpleHTTPGPSTracker {
  constructor() {
    this.esp8266IP = null;
    this.connected = false;
    this.busData = null;
    this.updateInterval = null;
  }

  // Initialize HTTP connection to ESP8266
  async init(studentData) {
    this.studentData = studentData;
    console.log('🌐 Initializing Simple HTTP GPS Connection...');
    
    // Show IP input dialog
    await this.showIPInputDialog();
    
    if (this.esp8266IP) {
      this.startPolling();
    }
  }

  // Show dialog to enter ESP8266 IP address
  async showIPInputDialog() {
    return new Promise((resolve) => {
      const mapCanvas = document.getElementById('busTrackingMap');
      if (mapCanvas) {
        mapCanvas.innerHTML = `
          <div class="w-full h-full bg-blue-50 rounded-xl border border-blue-200 flex items-center justify-center">
            <div class="text-center p-8">
              <i class="fas fa-server text-blue-500 text-4xl mb-4"></i>
              <h3 class="text-lg font-semibold text-blue-700 mb-4">Simple HTTP GPS Connection</h3>
              <p class="text-blue-600 mb-4">Enter your ESP8266 IP address (port 80 automatic):</p>
              <input type="text" id="esp8266IPInput" 
                     class="px-4 py-2 border rounded-lg mb-4" 
                     placeholder="10.238.98.197" 
                     value="10.238.98.197">
              <br>
              <button id="connectHTTPGPS" 
                      class="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 mr-2">
                Connect to GPS
              </button>
              <button id="testESP8266Web" 
                      class="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
                Open ESP8266 Web Page
              </button>
              <p class="text-blue-500 text-sm mt-2">
                💡 Check Arduino Serial Monitor for ESP8266 IP address
              </p>
            </div>
          </div>
        `;

        document.getElementById('connectHTTPGPS').addEventListener('click', () => {
          this.esp8266IP = document.getElementById('esp8266IPInput').value;
          resolve();
        });

        document.getElementById('testESP8266Web').addEventListener('click', () => {
          const ip = document.getElementById('esp8266IPInput').value;
          window.open(`http://${ip}`, '_blank');
        });
      }
    });
  }

  // Start polling GPS data from ESP8266
  startPolling() {
    console.log('🔄 Starting GPS polling from:', this.esp8266IP);
    
    // Test connection first
    this.fetchGPSData().then(() => {
      this.connected = true;
      this.showConnectedStatus();
      
      // Start regular polling every 3 seconds
      this.updateInterval = setInterval(() => {
        this.fetchGPSData();
      }, 3000);
      
    }).catch((error) => {
      console.error('❌ Connection failed:', error);
      this.showErrorStatus();
    });
  }

  // Fetch GPS data from ESP8266
  async fetchGPSData() {
    try {
      // Use port 80 for Simple HTTP server (not 81)
      const url = `http://${this.esp8266IP}/gps`;
      console.log('📡 Fetching GPS from:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        timeout: 5000
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('📍 HTTP GPS Data:', data);

      if (data.success && data.latitude && data.longitude) {
        this.busData = data;
        this.updateMapDisplay(data);
        this.updateInfoCard(data);
        this.connected = true;
      } else {
        this.showWaitingForGPS(data);
      }

    } catch (error) {
      console.error('❌ GPS fetch error:', error);
      this.connected = false;
      this.showErrorStatus();
    }
  }

  // Update map display
  updateMapDisplay(data) {
    const mapCanvas = document.getElementById('busTrackingMap');
    if (!mapCanvas) return;

    mapCanvas.innerHTML = `
      <div class="w-full h-full bg-green-50 rounded-xl border border-green-200 relative overflow-hidden">
        <div class="absolute top-4 left-4 bg-white px-3 py-1 rounded-lg shadow text-sm">
          <span class="text-green-600 font-semibold">🌐 HTTP GPS</span>
        </div>
        
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="text-center">
            <div class="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mb-4 animate-pulse">
              <i class="fas fa-bus text-white text-2xl"></i>
            </div>
            <h3 class="text-lg font-semibold text-green-700">Bus Direct GPS</h3>
            <p class="text-green-600">Lat: ${data.latitude.toFixed(6)}</p>
            <p class="text-green-600">Lng: ${data.longitude.toFixed(6)}</p>
            <p class="text-green-500 text-sm mt-2">${data.speed.toFixed(1)} km/h</p>
            ${data.datetime ? `<p class="text-green-400 text-xs mt-1">${data.datetime}</p>` : ''}
          </div>
        </div>
        
        <div class="absolute bottom-4 right-4">
          <a href="https://maps.google.com/?q=${data.latitude},${data.longitude}" 
             target="_blank" 
             class="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600">
            📍 Open in Maps
          </a>
        </div>
      </div>
    `;
  }

  // Update info card
  updateInfoCard(data) {
    const busInfoCard = document.getElementById('busInfoCard');
    if (!busInfoCard) return;

    const lastUpdate = new Date().toLocaleTimeString();
    const dataAge = data.age ? Math.round(data.age / 1000) : 0;
    
    busInfoCard.innerHTML = `
      <div class="flex items-center gap-6">
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center relative">
          <i class="fas fa-bus text-green-600 text-3xl"></i>
          <div class="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
        </div>
        <div class="flex-1">
          <h3 class="text-lg font-semibold text-green-700 mb-1">🌐 HTTP Direct GPS</h3>
          <div class="space-y-1 text-sm">
            <p class="text-gray-700">
              <i class="fas fa-map-marker-alt mr-2"></i>
              ${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}
            </p>
            <p class="text-gray-700">
              <i class="fas fa-tachometer-alt mr-2"></i>
              Speed: ${data.speed.toFixed(1)} km/h | Alt: ${data.altitude.toFixed(0)}m
            </p>
            <p class="text-gray-700">
              <i class="fas fa-satellite mr-2"></i>
              Satellites: ${data.satellites} | HDOP: ${data.hdop.toFixed(1)}
            </p>
            <p class="text-gray-500 text-xs">
              <i class="fas fa-server mr-2"></i>
              HTTP connection - Data age: ${dataAge}s
            </p>
          </div>
        </div>
        <div class="text-right">
          <div class="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
            🌐 HTTP LIVE
          </div>
        </div>
      </div>
    `;
  }

  // Show waiting for GPS status
  showWaitingForGPS(data) {
    const mapCanvas = document.getElementById('busTrackingMap');
    if (mapCanvas) {
      mapCanvas.innerHTML = `
        <div class="w-full h-full bg-yellow-50 rounded-xl border border-yellow-200 flex items-center justify-center">
          <div class="text-center p-8">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
            <h3 class="text-lg font-semibold text-yellow-700 mb-2">GPS Searching...</h3>
            <p class="text-yellow-600">${data.message || 'Waiting for satellite lock'}</p>
            <p class="text-yellow-500 text-sm mt-2">Connected to ESP8266 - Move to open area</p>
          </div>
        </div>
      `;
    }
  }

  // Show connected status
  showConnectedStatus() {
    const trackingStatus = document.getElementById('trackingStatus');
    if (trackingStatus) {
      trackingStatus.innerHTML = `
        <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        HTTP GPS connection active
      `;
    }
  }

  // Show error status
  showErrorStatus() {
    const mapCanvas = document.getElementById('busTrackingMap');
    if (mapCanvas) {
      mapCanvas.innerHTML = `
        <div class="w-full h-full bg-red-50 rounded-xl border border-red-200 flex items-center justify-center">
          <div class="text-center p-8">
            <i class="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
            <h3 class="text-lg font-semibold text-red-700 mb-2">Connection Failed</h3>
            <p class="text-red-600 mb-4">Cannot connect to ESP8266 GPS tracker</p>
            <p class="text-red-500 text-sm mb-4">IP: ${this.esp8266IP}</p>
            <button onclick="location.reload()" class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 mr-2">
              Retry Connection
            </button>
            <a href="http://${this.esp8266IP}" target="_blank" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
              Open ESP8266 Page
            </a>
          </div>
        </div>
      `;
    }
  }

  // Cleanup
  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    this.connected = false;
  }
}

// Export for use
export default SimpleHTTPGPSTracker;
