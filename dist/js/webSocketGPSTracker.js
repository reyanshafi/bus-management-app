/*
 * WebSocket GPS Tracker for Student Portal
 * Connects to ESP8266 WebSocket server on port 81
 * Real-time GPS tracking with reconnection
 */

class WebSocketGPSTracker {
    constructor() {
        this.ws = null;
        this.connected = false;
        this.currentPosition = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 3000;
        this.ipAddress = localStorage.getItem('esp8266-ip') || '10.238.98.197';
        this.onLocationUpdate = null; // Callback for location updates
    }

    // Connect to ESP8266 WebSocket
    async connect() {
        return new Promise((resolve, reject) => {
            try {
                console.log('🔗 Connecting to ESP8266 WebSocket:', `ws://${this.ipAddress}:81`);
                
                this.ws = new WebSocket(`ws://${this.ipAddress}:81`);
                
                this.ws.onopen = () => {
                    console.log('✅ WebSocket connected to ESP8266');
                    this.connected = true;
                    this.reconnectAttempts = 0;
                    resolve(true);
                };

                this.ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        console.log('📡 GPS Data received:', data);
                        
                        if (data.type === 'gps_update' && data.latitude && data.longitude) {
                            this.currentPosition = {
                                lat: parseFloat(data.latitude),
                                lng: parseFloat(data.longitude),
                                busId: data.busId,
                                speed: data.speed || 0,
                                altitude: data.altitude || 0,
                                satellites: data.satellites || 0,
                                timestamp: Date.now()
                            };
                            
                            // Trigger map update
                            this.updateMapDisplay(this.currentPosition);
                            
                            // Trigger callback if set
                            if (this.onLocationUpdate) {
                                this.onLocationUpdate(this.currentPosition);
                            }
                        }
                    } catch (error) {
                        console.error('❌ WebSocket message parse error:', error);
                    }
                };

                this.ws.onclose = (event) => {
                    console.log('🔌 WebSocket disconnected:', event.code, event.reason);
                    this.connected = false;
                    
                    if (this.reconnectAttempts < this.maxReconnectAttempts) {
                        this.scheduleReconnect();
                    }
                };

                this.ws.onerror = (error) => {
                    console.error('❌ WebSocket error:', error);
                    reject(error);
                };

                // Connection timeout
                setTimeout(() => {
                    if (this.ws.readyState !== WebSocket.OPEN) {
                        this.ws.close();
                        reject(new Error('WebSocket connection timeout'));
                    }
                }, 5000);

            } catch (error) {
                console.error('❌ WebSocket connection failed:', error);
                reject(error);
            }
        });
    }

    // Schedule reconnection
    scheduleReconnect() {
        this.reconnectAttempts++;
        console.log(`🔄 Scheduling reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectDelay}ms`);
        
        setTimeout(() => {
            console.log('🔄 Attempting to reconnect...');
            this.connect().catch(error => {
                console.error('❌ Reconnection failed:', error);
            });
        }, this.reconnectDelay);
    }

    // Get current GPS position
    async getCurrentPosition() {
        if (!this.connected) {
            throw new Error('WebSocket not connected to ESP8266');
        }
        
        if (!this.currentPosition) {
            throw new Error('No GPS data received yet');
        }
        
        return this.currentPosition;
    }

    // Check if tracker is available
    isAvailable() {
        return this.connected && this.currentPosition !== null;
    }

    // Set IP address and reconnect
    async setIPAddress(ip) {
        if (ip !== this.ipAddress) {
            this.ipAddress = ip;
            localStorage.setItem('esp8266-ip', ip);
            
            if (this.ws) {
                this.ws.close();
            }
            
            return this.connect();
        }
    }

    // Initialize GPS tracking for a bus (required interface method)
    async init(studentData) {
        try {
            console.log('🔗 WebSocket GPS: Initializing tracking...');
            this.studentData = studentData;
            this.targetBusId = studentData?.busId || studentData?.assignedBus?.busId;
            
            console.log('📍 Target Bus ID:', this.targetBusId);
            
            // Show IP input dialog first
            await this.promptForIP();
            
            // Try to connect
            if (this.ipAddress) {
                await this.connect();
                console.log('✅ WebSocket GPS tracker initialized successfully');
                return true;
            } else {
                throw new Error('No IP address provided');
            }
        } catch (error) {
            console.error('❌ WebSocket GPS initialization failed:', error);
            
            // Show error on map
            this.showConnectionError(error.message);
            throw error;
        }
    }

    // Alternative initialize method for compatibility
    async initialize(busId) {
        return this.init({ busId: busId });
    }

    // Start tracking (required interface)
    async startTracking() {
        if (!this.connected) {
            await this.connect();
        }
        console.log('🚌 WebSocket GPS tracking started');
        return true;
    }

    // Update map display (required interface)
    updateMapDisplay(position) {
        const mapCanvas = document.getElementById('busTrackingMap');
        if (!mapCanvas) return;

        mapCanvas.innerHTML = `
          <div class="w-full h-full bg-blue-50 rounded-xl border border-blue-200 relative overflow-hidden">
            <div class="absolute top-4 left-4 bg-white px-3 py-1 rounded-lg shadow text-sm">
              <span class="text-blue-600 font-semibold">🔗 WebSocket GPS</span>
            </div>
            
            <div class="absolute inset-0 flex items-center justify-center">
              <div class="text-center">
                <div class="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mb-4 animate-pulse">
                  <i class="fas fa-bus text-white text-2xl"></i>
                </div>
                <h3 class="text-lg font-semibold text-blue-700">Bus Live GPS</h3>
                <p class="text-blue-600">Lat: ${position.lat.toFixed(6)}</p>
                <p class="text-blue-600">Lng: ${position.lng.toFixed(6)}</p>
                <p class="text-blue-500 text-sm mt-2">${position.speed.toFixed(1)} km/h</p>
                <p class="text-blue-400 text-xs mt-1">Satellites: ${position.satellites}</p>
                <p class="text-blue-400 text-xs">Real-time WebSocket</p>
              </div>
            </div>
            
            <div class="absolute bottom-4 right-4">
              <a href="https://maps.google.com/?q=${position.lat},${position.lng}" 
                 target="_blank" 
                 class="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600">
                📍 Open in Maps
              </a>
            </div>
          </div>
        `;
        
        // Update info card if exists
        this.updateInfoCard(position);
    }

    // Update info card
    updateInfoCard(position) {
        const busInfoCard = document.getElementById('busInfoCard');
        if (!busInfoCard) return;

        const lastUpdate = new Date().toLocaleTimeString();
        const dataAge = position.timestamp ? Math.round((Date.now() - position.timestamp) / 1000) : 0;
        
        busInfoCard.innerHTML = `
          <div class="bg-white p-4 rounded-lg shadow">
            <h4 class="font-semibold text-blue-700 mb-2">🔗 WebSocket GPS Status</h4>
            <div class="space-y-1 text-sm">
              <div class="flex justify-between">
                <span>Connection:</span>
                <span class="text-green-600 font-semibold">✅ Connected</span>
              </div>
              <div class="flex justify-between">
                <span>Bus ID:</span>
                <span class="font-mono text-xs">${position.busId}</span>
              </div>
              <div class="flex justify-between">
                <span>Speed:</span>
                <span>${position.speed.toFixed(1)} km/h</span>
              </div>
              <div class="flex justify-between">
                <span>Altitude:</span>
                <span>${position.altitude.toFixed(1)} m</span>
              </div>
              <div class="flex justify-between">
                <span>Satellites:</span>
                <span>${position.satellites}</span>
              </div>
              <div class="flex justify-between">
                <span>Data Age:</span>
                <span>${dataAge}s ago</span>
              </div>
              <div class="flex justify-between">
                <span>Last Update:</span>
                <span>${lastUpdate}</span>
              </div>
            </div>
          </div>
        `;
    }

    // Show connection error
    showConnectionError(message) {
        const mapCanvas = document.getElementById('busTrackingMap');
        if (!mapCanvas) return;

        mapCanvas.innerHTML = `
          <div class="w-full h-full bg-red-50 rounded-xl border border-red-200 relative overflow-hidden">
            <div class="absolute inset-0 flex items-center justify-center">
              <div class="text-center p-6">
                <div class="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mb-4 mx-auto">
                  <i class="fas fa-exclamation-triangle text-white text-2xl"></i>
                </div>
                <h3 class="text-lg font-semibold text-red-700 mb-2">WebSocket Connection Failed</h3>
                <p class="text-red-600 mb-4">${message}</p>
                <p class="text-red-500 text-sm">
                  Make sure your ESP8266 is powered on and connected to WiFi.<br>
                  WebSocket server should be running on port 81.
                </p>
              </div>
            </div>
          </div>
        `;
    }

    // Destroy/cleanup (required interface)
    destroy() {
        console.log('🗑️ WebSocket GPS tracker cleanup');
        this.disconnect();
    }

    // Get connection info
    getConnectionInfo() {
        return {
            method: 'WebSocket',
            address: `ws://${this.ipAddress}:81`,
            connected: this.connected,
            hasData: this.currentPosition !== null,
            lastUpdate: this.currentPosition ? this.currentPosition.timestamp : null
        };
    }

    // Disconnect
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.connected = false;
        this.currentPosition = null;
    }

    // Show IP input dialog
    async promptForIP() {
        return new Promise((resolve) => {
            const mapCanvas = document.getElementById('busTrackingMap');
            if (mapCanvas) {
                mapCanvas.innerHTML = `
                    <div class="w-full h-full bg-gray-50 rounded-xl border border-gray-200 relative overflow-hidden">
                        <div class="absolute inset-0 flex items-center justify-center">
                            <div class="text-center p-6 max-w-md">
                                <div class="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mb-4 mx-auto">
                                    <i class="fas fa-wifi text-white text-2xl"></i>
                                </div>
                                <h3 class="text-lg font-semibold text-gray-700 mb-4">WebSocket GPS Connection</h3>
                                <p class="text-gray-600 mb-4">Enter ESP8266 IP address for WebSocket connection (port 81)</p>
                                <input type="text" id="esp8266IPInput" 
                                       value="${this.ipAddress}" 
                                       placeholder="192.168.1.100"
                                       class="border border-gray-300 rounded px-3 py-2 w-full mb-4">
                                <div class="flex gap-2">
                                    <button id="connectESP8266" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex-1">
                                        🔗 Connect WebSocket
                                    </button>
                                    <button id="cancelESP8266" class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 flex-1">
                                        Cancel
                                    </button>
                                </div>
                                <p class="text-xs text-gray-500 mt-2">Default: ${this.ipAddress}</p>
                            </div>
                        </div>
                    </div>
                `;

                // Handle connect button
                document.getElementById('connectESP8266').addEventListener('click', async () => {
                    const newIP = document.getElementById('esp8266IPInput').value.trim();
                    if (newIP) {
                        await this.setIPAddress(newIP);
                        resolve(newIP);
                    }
                });

                // Handle cancel button
                document.getElementById('cancelESP8266').addEventListener('click', () => {
                    resolve(null);
                });

                // Handle Enter key
                document.getElementById('esp8266IPInput').addEventListener('keypress', async (e) => {
                    if (e.key === 'Enter') {
                        const newIP = e.target.value.trim();
                        if (newIP) {
                            await this.setIPAddress(newIP);
                            resolve(newIP);
                        }
                    }
                });
            } else {
                // Fallback to browser prompt if no map canvas
                const ip = prompt('Enter ESP8266 IP Address for WebSocket (port 81):', this.ipAddress);
                if (ip && ip !== this.ipAddress) {
                    this.setIPAddress(ip).then(() => resolve(ip));
                } else {
                    resolve(ip);
                }
            }
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebSocketGPSTracker;
} else {
    window.WebSocketGPSTracker = WebSocketGPSTracker;
}

console.log('🔗 WebSocketGPSTracker loaded - Ready for ESP8266 port 81');
