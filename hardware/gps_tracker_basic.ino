#include <SoftwareSerial.h>
#include <TinyGPS++.h>

// GPS Module connections (Fixed pins to avoid GPIO0)
static const int RXPin = D1;  // GPIO5 (safer choice)
static const int TXPin = D2;  // GPIO4 (safer choice)

// The serial connection to the GPS device
SoftwareSerial ss(RXPin, TXPin);

// Create TinyGPS++ object
TinyGPSPlus gps;

// Variables to store location data
float latitude, longitude;
unsigned long lastGPSTime = 0;
unsigned long lastLEDTime = 0;
bool ledState = false;

// LED pin for status indication
const int ledPin = D4;  // GPIO2 (built-in LED)

// Bus identification
const String busId = "BUS_001"; // Change this for each bus

// Timing constants
const unsigned long GPS_TIMEOUT = 10000; // 10 seconds
const unsigned long LED_FAST_BLINK = 200; // 200ms for valid GPS
const unsigned long LED_SLOW_BLINK = 1000; // 1000ms for no GPS

void setup() {
  Serial.begin(115200);
  ss.begin(9600);
  
  pinMode(ledPin, OUTPUT);
  digitalWrite(ledPin, HIGH); // Turn on LED initially
  
  Serial.println("\n=== ESP8266 GPS Bus Tracker (Basic Version) ===");
  Serial.println("Bus ID: " + busId);
  Serial.println("Waiting for GPS signal...");
  Serial.println("==============================================");
  
  lastGPSTime = millis();
}

void loop() {
  // Handle GPS data
  handleGPS();
  
  // Handle LED status indication (non-blocking)
  handleStatusLED();
  
  // Small delay to prevent watchdog issues
  delay(10);
}

void handleGPS() {
  // Read data from GPS module
  while (ss.available() > 0) {
    if (gps.encode(ss.read())) {
      lastGPSTime = millis(); // Reset timeout counter
      displayGPSInfo();
    }
  }
  
  // Check for GPS timeout (non-blocking)
  if (millis() - lastGPSTime > GPS_TIMEOUT) {
    if (gps.charsProcessed() < 10) {
      Serial.println("⚠️  WARNING: No GPS data received for " + String(GPS_TIMEOUT/1000) + " seconds");
      Serial.println("📡 Check GPS module wiring and antenna connection");
      Serial.println("🛰️  Satellites in view: " + String(gps.satellites.value()));
      Serial.println("----------------------------------------");
    }
    lastGPSTime = millis(); // Reset to prevent spam
  }
}

void handleStatusLED() {
  unsigned long currentTime = millis();
  unsigned long blinkInterval = gps.location.isValid() ? LED_FAST_BLINK : LED_SLOW_BLINK;
  
  // Non-blocking LED blink
  if (currentTime - lastLEDTime >= blinkInterval) {
    ledState = !ledState;
    digitalWrite(ledPin, ledState ? LOW : HIGH); // Inverted for built-in LED
    lastLEDTime = currentTime;
  }
}

void displayGPSInfo() {
  if (gps.location.isValid()) {
    latitude = gps.location.lat();
    longitude = gps.location.lng();
    
    Serial.println("========================================");
    Serial.println("📍 GPS DATA RECEIVED");
    Serial.println("🚌 Bus ID: " + busId);
    Serial.println("📍 Coordinates:");
    Serial.printf("   Latitude:  %.8f\n", latitude);
    Serial.printf("   Longitude: %.8f\n", longitude);
    Serial.printf("   Altitude:  %.2f meters\n", gps.altitude.meters());
    
    Serial.println();
    Serial.println("🗺️  Location Links:");
    // Google Maps link
    Serial.printf("   Google Maps: https://maps.google.com/?q=%.6f,%.6f\n", latitude, longitude);
    // OpenStreetMap link
    Serial.printf("   OpenStreetMap: https://www.openstreetmap.org/?mlat=%.6f&mlon=%.6f#map=18/%.6f/%.6f\n", 
                  latitude, longitude, latitude, longitude);
    
    Serial.println();
    Serial.println("🚌 Movement Data:");
    Serial.printf("   Speed:     %.2f km/h (%.2f mph)\n", gps.speed.kmph(), gps.speed.mph());
    Serial.printf("   Course:    %.2f° (%s)\n", gps.course.deg(), getCardinalDirection(gps.course.deg()));
    
    Serial.println();
    Serial.println("🛰️  GPS Quality:");
    Serial.printf("   Satellites: %d\n", gps.satellites.value());
    Serial.printf("   HDOP:       %.2f (%s)\n", gps.hdop.hdop(), getHDOPDescription(gps.hdop.hdop()));
    
    // Date and time
    if (gps.date.isValid() && gps.time.isValid()) {
      Serial.println();
      Serial.println("🕐 Date & Time (UTC):");
      Serial.printf("   Date: %02d/%02d/%04d\n", gps.date.day(), gps.date.month(), gps.date.year());
      Serial.printf("   Time: %02d:%02d:%02d\n", gps.time.hour(), gps.time.minute(), gps.time.second());
    }
    
  } else {
    Serial.println("========================================");
    Serial.println("⚠️  GPS LOCATION: Not Available");
    Serial.println("🚌 Bus ID: " + busId);
    Serial.printf("🛰️  Satellites in view: %d\n", gps.satellites.value());
    
    // Show HDOP even without valid location
    if (gps.hdop.isValid()) {
      Serial.printf("📊 HDOP: %.2f (%s)\n", gps.hdop.hdop(), getHDOPDescription(gps.hdop.hdop()));
    }
    
    // Show what data is available
    if (gps.time.isValid()) {
      Serial.printf("🕐 GPS Time: %02d:%02d:%02d UTC\n", gps.time.hour(), gps.time.minute(), gps.time.second());
    }
    
    Serial.println("💡 Tip: Move to an open area with clear sky view");
  }
  
  Serial.println("========================================\n");
}

// Helper function to get cardinal direction from degrees
String getCardinalDirection(float degrees) {
  if (degrees < 0) degrees += 360;
  
  const char* directions[] = {
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"
  };
  
  int index = (int)((degrees + 11.25) / 22.5) % 16;
  return String(directions[index]);
}

// Helper function to describe HDOP values
String getHDOPDescription(float hdop) {
  if (hdop < 1) return "Ideal";
  else if (hdop < 2) return "Excellent";
  else if (hdop < 5) return "Good";
  else if (hdop < 10) return "Moderate";
  else if (hdop < 20) return "Fair";
  else return "Poor";
}

// Function to get formatted GPS data as compact string
String getGPSData() {
  String data = "";
  
  if (gps.location.isValid()) {
    data += "Bus:" + busId;
    data += ",Lat:" + String(gps.location.lat(), 8);
    data += ",Lng:" + String(gps.location.lng(), 8);
    data += ",Alt:" + String(gps.altitude.meters(), 1) + "m";
    data += ",Spd:" + String(gps.speed.kmph(), 1) + "kmh";
    data += ",Crs:" + String(gps.course.deg(), 1) + "°";
    data += ",Sat:" + String(gps.satellites.value());
    data += ",HDOP:" + String(gps.hdop.hdop(), 1);
    
    // Add timestamp if available
    if (gps.time.isValid()) {
      data += ",Time:" + String(gps.time.hour()) + ":" + 
              String(gps.time.minute()) + ":" + String(gps.time.second());
    }
  } else {
    data = "Bus:" + busId + ",Status:No GPS signal";
    data += ",Sat:" + String(gps.satellites.value());
    data += ",HDOP:" + String(gps.hdop.hdop(), 1);
  }
  
  return data;
}

// Function to get detailed GPS data as JSON-like string
String getDetailedGPSData() {
  String data = "{";
  
  data += "\"busId\":\"" + busId + "\",";
  data += "\"valid\":" + String(gps.location.isValid() ? "true" : "false") + ",";
  
  if (gps.location.isValid()) {
    data += "\"lat\":" + String(gps.location.lat(), 8) + ",";
    data += "\"lng\":" + String(gps.location.lng(), 8) + ",";
    data += "\"alt\":" + String(gps.altitude.meters(), 1) + ",";
    data += "\"speed\":" + String(gps.speed.kmph(), 1) + ",";
    data += "\"course\":" + String(gps.course.deg(), 1) + ",";
  }
  
  data += "\"satellites\":" + String(gps.satellites.value()) + ",";
  data += "\"hdop\":" + String(gps.hdop.hdop(), 1) + ",";
  data += "\"uptime\":" + String(millis() / 1000);
  
  // Add date/time if available
  if (gps.date.isValid() && gps.time.isValid()) {
    data += ",\"datetime\":\"" + String(gps.date.year()) + "-" + 
            String(gps.date.month()) + "-" + String(gps.date.day()) + 
            " " + String(gps.time.hour()) + ":" + 
            String(gps.time.minute()) + ":" + String(gps.time.second()) + "\"";
  }
  
  data += "}";
  return data;
}

// Utility function to print system diagnostics
void printSystemDiagnostics() {
  Serial.println("\n=== SYSTEM DIAGNOSTICS ===");
  Serial.println("Bus ID: " + busId);
  Serial.println("Chip ID: " + String(ESP.getChipId(), HEX));
  Serial.println("Flash Chip Size: " + String(ESP.getFlashChipSize()) + " bytes");
  Serial.println("Free Heap: " + String(ESP.getFreeHeap()) + " bytes");
  Serial.println("Uptime: " + String(millis() / 1000) + " seconds");
  Serial.println("GPS Characters Processed: " + String(gps.charsProcessed()));
  Serial.println("GPS Sentences Passed: " + String(gps.passedChecksum()));
  Serial.println("GPS Sentences Failed: " + String(gps.failedChecksum()));
  Serial.println("============================\n");
}
