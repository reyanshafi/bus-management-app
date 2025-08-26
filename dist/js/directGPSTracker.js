// Direct GPS WebSocket Client for Student Portal
// Connects directly to ESP8266 GPS tracker

class DirectGPSTracker {
  constructor() {
    this.websocket = null;
    this.connected = false;
    this.busData = null;
    this.esp8266IP = null; // Will be set dynamically
  }

  // Initialize direct connection to ESP8266
  async init(studentData) {
    this.studentData = studentData;
    console.log('🔗 Initializing Direct GPS Connection...');
    
    // Try to find ESP8266 on network (you'll need to set the IP)
    // For now, user needs to enter the ESP8266 IP address
    await this.showIPInputDialog();
    
    if (this.esp8266IP) {
      this.connect();
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
              <i class="fas fa-wifi text-blue-500 text-4xl mb-4"></i>
              <h3 class="text-lg font-semibold text-blue-700 mb-4">Direct GPS Connection</h3>
              <p class="text-blue-600 mb-4">Enter your ESP8266 IP address:</p>
              <input type="text" id="esp8266IPInput" 
                     class="px-4 py-2 border rounded-lg mb-4" 
                     placeholder="192.168.1.100" 
                     value="192.168.1.100">
              <br>
              <button id="connectDirectGPS" 
                      class="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                Connect to GPS
              </button>
              <p class="text-blue-500 text-sm mt-2">
                💡 Check Arduino Serial Monitor for ESP8266 IP address
              </p>
            </div>
          </div>
        `;

        document.getElementById('connectDirectGPS').addEventListener('click', () => {
          this.esp8266IP = document.getElementById('esp8266IPInput').value;
          resolve();
        });
      }
    });
  }

  // Connect to ESP8266 WebSocket
  connect() {
    const wsURL = `ws://${this.esp8266IP}:81`;
    console.log('🔗 Connecting to:', wsURL);

    this.websocket = new WebSocket(wsURL);

    this.websocket.onopen = () => {
      console.log('✅ Direct GPS connection established');
      this.connected = true;
      this.showConnectedStatus();
    };

    this.websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'gps_update') {
          this.handleGPSUpdate(data);
        }
      } catch (error) {
        console.error('❌ Error parsing GPS data:', error);
      }
    };

    this.websocket.onclose = () => {
      console.log('📡 GPS connection closed');
      this.connected = false;
      this.showDisconnectedStatus();
      
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        if (!this.connected) {
          console.log('🔄 Attempting to reconnect...');
          this.connect();
        }
      }, 5000);
    };

    this.websocket.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      this.showErrorStatus();
    };
  }

  // Handle real-time GPS updates
  handleGPSUpdate(data) {
    console.log('📍 Direct GPS Update:', data);
    
    this.busData = data;
    this.updateMapDisplay(data);
    this.updateInfoCard(data);
  }

  // Update map display
  updateMapDisplay(data) {
    const mapCanvas = document.getElementById('busTrackingMap');
    if (!mapCanvas) return;

    mapCanvas.innerHTML = `
      <div class="w-full h-full bg-green-50 rounded-xl border border-green-200 relative overflow-hidden">
        <div class="absolute top-4 left-4 bg-white px-3 py-1 rounded-lg shadow text-sm">
          <span class="text-green-600 font-semibold">🟢 LIVE GPS</span>
        </div>
        
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="text-center">
            <div class="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mb-4 animate-pulse">
              <i class="fas fa-bus text-white text-2xl"></i>
            </div>
            <h3 class="text-lg font-semibold text-green-700">Bus #${data.busId}</h3>
            <p class="text-green-600">Lat: ${data.latitude.toFixed(6)}</p>
            <p class="text-green-600">Lng: ${data.longitude.toFixed(6)}</p>
            <p class="text-green-500 text-sm mt-2">${data.speed.toFixed(1)} km/h</p>
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
    
    busInfoCard.innerHTML = `
      <div class="flex items-center gap-6">
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center relative">
          <i class="fas fa-bus text-green-600 text-3xl"></i>
          <div class="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
        </div>
        <div class="flex-1">
          <h3 class="text-lg font-semibold text-green-700 mb-1">🚌 Direct GPS Connection</h3>
          <div class="space-y-1 text-sm">
            <p class="text-gray-700">
              <i class="fas fa-map-marker-alt mr-2"></i>
              ${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}
            </p>
            <p class="text-gray-700">
              <i class="fas fa-tachometer-alt mr-2"></i>
              Speed: ${data.speed.toFixed(1)} km/h
            </p>
            <p class="text-gray-700">
              <i class="fas fa-satellite mr-2"></i>
              Satellites: ${data.satellites}
            </p>
            <p class="text-gray-500 text-xs">
              <i class="fas fa-wifi mr-2"></i>
              Direct connection - Last update: ${lastUpdate}
            </p>
          </div>
        </div>
        <div class="text-right">
          <div class="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
            🟢 LIVE DIRECT
          </div>
        </div>
      </div>
    `;
  }

  // Show connected status
  showConnectedStatus() {
    const trackingStatus = document.getElementById('trackingStatus');
    if (trackingStatus) {
      trackingStatus.innerHTML = `
        <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        Direct GPS connection active
      `;
    }
  }

  // Show disconnected status
  showDisconnectedStatus() {
    const trackingStatus = document.getElementById('trackingStatus');
    if (trackingStatus) {
      trackingStatus.innerHTML = `
        <div class="w-2 h-2 bg-red-500 rounded-full"></div>
        GPS connection lost - reconnecting...
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
            <p class="text-red-500 text-sm mb-4">Check ESP8266 IP address: ${this.esp8266IP}</p>
            <button onclick="location.reload()" class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
              Retry Connection
            </button>
          </div>
        </div>
      `;
    }
  }

  // Cleanup
  destroy() {
    if (this.websocket) {
      this.websocket.close();
    }
  }
}

// Export for use
export default DirectGPSTracker;
