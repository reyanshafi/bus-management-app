// Environment Configuration for Bus Management System

// Development Environment
const DEV_CONFIG = {
  name: 'Development',
  allowDirectESP: true,
  allowWebSocket: true,
  allowHTTP: true,
  gpsTrackerPriority: ['WebSocket', 'HTTP', 'Firebase'],
  debugMode: true,
  esp8266DefaultIP: '10.238.98.197'
};

// Production Environment  
const PROD_CONFIG = {
  name: 'Production',
  allowDirectESP: false,  // Disable direct ESP8266 connections
  allowWebSocket: false,  // Disable WebSocket for HTTPS compatibility
  allowHTTP: false,       // Disable HTTP for security
  gpsTrackerPriority: ['Firebase'], // Only Firebase allowed
  debugMode: false,
  esp8266DefaultIP: null
};

// Auto-detect environment
const isProduction = () => {
  return window.location.protocol === 'https:' || 
         window.location.hostname.includes('vercel.app') ||
         window.location.hostname.includes('netlify.app') ||
         window.location.hostname.includes('github.io') ||
         !window.location.hostname.includes('localhost');
};

// Get current environment config
const getEnvironmentConfig = () => {
  return isProduction() ? PROD_CONFIG : DEV_CONFIG;
};

// GPS Tracker Factory
const createGPSTracker = (config = null) => {
  const env = config || getEnvironmentConfig();
  
  console.log(`🌍 Environment: ${env.name}`);
  console.log(`🎯 GPS Priority: [${env.gpsTrackerPriority.join(', ')}]`);
  
  // Try each tracker in priority order
  for (const trackerType of env.gpsTrackerPriority) {
    try {
      switch (trackerType) {
        case 'WebSocket':
          if (env.allowWebSocket && typeof WebSocketGPSTracker !== 'undefined') {
            console.log('🔗 Using WebSocket GPS Tracker');
            return new WebSocketGPSTracker();
          }
          break;
          
        case 'HTTP':
          if (env.allowHTTP && typeof SimpleHTTPGPSTracker !== 'undefined') {
            console.log('🌐 Using HTTP GPS Tracker');
            return new SimpleHTTPGPSTracker();
          }
          break;
          
        case 'Firebase':
          if (typeof LiveBusTracker !== 'undefined') {
            console.log('🔥 Using Firebase GPS Tracker');
            return new LiveBusTracker();
          }
          break;
      }
    } catch (error) {
      console.warn(`⚠️ ${trackerType} GPS Tracker failed to initialize:`, error);
    }
  }
  
  // Fallback to any available tracker
  if (typeof LiveBusTracker !== 'undefined') {
    console.log('🔥 Fallback: Using Firebase GPS Tracker');
    return new LiveBusTracker();
  }
  
  throw new Error('No GPS tracker available for this environment');
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DEV_CONFIG,
    PROD_CONFIG,
    isProduction,
    getEnvironmentConfig,
    createGPSTracker
  };
} else {
  window.EnvironmentConfig = {
    DEV_CONFIG,
    PROD_CONFIG,
    isProduction,
    getEnvironmentConfig,
    createGPSTracker
  };
}

console.log(`🌍 Environment Config loaded: ${getEnvironmentConfig().name}`);
