#include <SoftwareSerial.h>
#include <TinyGPS++.h>
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <ArduinoJson.h>

// GPS Module connections (Updated pins to avoid GPIO0)
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

// WiFi credentials (replace with your network)
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Server endpoint for sending GPS data (replace with your server)
const char* serverURL = "https://your-server.com/api/gps-update";

// Bus identification
const String busId = "BUS_001"; // Change this for each bus

// Timing constants
const unsigned long GPS_TIMEOUT = 10000; // 10 seconds
const unsigned long UPDATE_INTERVAL = 5000; // 5 seconds
const unsigned long LED_BLINK_INTERVAL = 100; // 100ms
const unsigned long WIFI_CHECK_INTERVAL = 30000; // 30 seconds

unsigned long lastUpdate = 0;
unsigned long lastWiFiCheck = 0;

void setup() {
  Serial.begin(115200);
  ss.begin(9600);
  
  pinMode(ledPin, OUTPUT);
  digitalWrite(ledPin, HIGH); // Turn on LED initially
  
  Serial.println("\n=== Enhanced ESP8266 GPS Bus Tracker ===");
  Serial.println("Bus ID: " + busId);
  Serial.println("Initializing...");
  
  // Initialize WiFi
  setupWiFi();
  
  Serial.println("Waiting for GPS signal...");
  Serial.println("========================================");
  
  lastGPSTime = millis();
}

void loop() {
  // Handle GPS data
  handleGPS();
  
  // Handle LED blinking (non-blocking)
  handleLED();
  
  // Send data to server periodically
  if (millis() - lastUpdate > UPDATE_INTERVAL) {
    if (gps.location.isValid()) {
      sendGPSData();
    }
    lastUpdate = millis();
  }
  
  // Check WiFi connection periodically
  if (millis() - lastWiFiCheck > WIFI_CHECK_INTERVAL) {
    checkWiFiConnection();
    lastWiFiCheck = millis();
  }
  
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
      Serial.println("WARNING: No GPS data received. Checking connection...");
      Serial.println("Satellites in view: " + String(gps.satellites.value()));
    }
    lastGPSTime = millis(); // Reset to prevent spam
  }
}

void handleLED() {
  // Non-blocking LED blink
  if (millis() - lastLEDTime > LED_BLINK_INTERVAL) {
    if (gps.location.isValid()) {
      // Fast blink when GPS is valid
      ledState = !ledState;
      digitalWrite(ledPin, ledState ? LOW : HIGH); // Inverted for built-in LED
    } else {
      // Slow blink when no GPS
      if (millis() - lastLEDTime > 500) {
        ledState = !ledState;
        digitalWrite(ledPin, ledState ? LOW : HIGH);
        lastLEDTime = millis();
      }
      return;
    }
    lastLEDTime = millis();
  }
}

void displayGPSInfo() {
  if (gps.location.isValid()) {
    latitude = gps.location.lat();
    longitude = gps.location.lng();
    
    Serial.println("========================================");
    Serial.println("📍 GPS DATA RECEIVED");
    Serial.println("Bus ID: " + busId);
    Serial.printf("Latitude: %.6f\n", latitude);
    Serial.printf("Longitude: %.6f\n", longitude);
    Serial.printf("Altitude: %.2f meters\n", gps.altitude.meters());
    
    // Google Maps link
    Serial.printf("🗺️  Google Maps: https://maps.google.com/?q=%.6f,%.6f\n", latitude, longitude);
    
    // Speed and course
    Serial.printf("🚌 Speed: %.2f km/h\n", gps.speed.kmph());
    Serial.printf("🧭 Course: %.2f°\n", gps.course.deg());
    
    // Satellite info
    Serial.printf("🛰️  Satellites: %d\n", gps.satellites.value());
    
    // Date and time
    if (gps.date.isValid() && gps.time.isValid()) {
      Serial.printf("📅 Date: %02d/%02d/%04d\n", gps.date.day(), gps.date.month(), gps.date.year());
      Serial.printf("🕐 Time: %02d:%02d:%02d UTC\n", gps.time.hour(), gps.time.minute(), gps.time.second());
    }
    
    // HDOP (Horizontal Dilution of Precision)
    Serial.printf("📊 HDOP: %.2f\n", gps.hdop.hdop());
    
    // WiFi status
    Serial.printf("📶 WiFi: %s\n", WiFi.status() == WL_CONNECTED ? "Connected" : "Disconnected");
    
  } else {
    Serial.println("⚠️  GPS Location: Not available");
    Serial.printf("🛰️  Satellites in view: %d\n", gps.satellites.value());
    
    // Show HDOP even without valid location
    if (gps.hdop.isValid()) {
      Serial.printf("📊 HDOP: %.2f\n", gps.hdop.hdop());
    }
  }
  
  Serial.println("========================================");
}

void setupWiFi() {
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("✅ WiFi Connected!");
    Serial.println("IP address: " + WiFi.localIP().toString());
  } else {
    Serial.println();
    Serial.println("❌ WiFi Connection Failed!");
    Serial.println("Continuing with GPS tracking only...");
  }
}

void checkWiFiConnection() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("🔄 WiFi disconnected, reconnecting...");
    WiFi.begin(ssid, password);
    
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 10) {
      delay(500);
      attempts++;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("✅ WiFi Reconnected!");
    } else {
      Serial.println("❌ WiFi Reconnection Failed!");
    }
  }
}

void sendGPSData() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("📶 No WiFi connection - GPS data not sent");
    return;
  }
  
  WiFiClient client;
  HTTPClient http;
  
  http.begin(client, serverURL);
  http.addHeader("Content-Type", "application/json");
  
  // Create JSON payload
  DynamicJsonDocument doc(1024);
  doc["busId"] = busId;
  doc["latitude"] = latitude;
  doc["longitude"] = longitude;
  doc["altitude"] = gps.altitude.meters();
  doc["speed"] = gps.speed.kmph();
  doc["course"] = gps.course.deg();
  doc["satellites"] = gps.satellites.value();
  doc["hdop"] = gps.hdop.hdop();
  doc["timestamp"] = millis();
  
  // Add date/time if valid
  if (gps.date.isValid() && gps.time.isValid()) {
    char datetime[32];
    sprintf(datetime, "%04d-%02d-%02d %02d:%02d:%02d", 
            gps.date.year(), gps.date.month(), gps.date.day(),
            gps.time.hour(), gps.time.minute(), gps.time.second());
    doc["datetime"] = datetime;
  }
  
  String payload;
  serializeJson(doc, payload);
  
  int httpResponseCode = http.POST(payload);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("📡 Data sent successfully! Response: " + String(httpResponseCode));
    Serial.println("Response: " + response);
  } else {
    Serial.println("❌ Error sending data: " + String(httpResponseCode));
  }
  
  http.end();
}

// Enhanced function to get formatted GPS data as JSON string
String getGPSDataJSON() {
  DynamicJsonDocument doc(512);
  
  if (gps.location.isValid()) {
    doc["status"] = "valid";
    doc["busId"] = busId;
    doc["lat"] = gps.location.lat();
    doc["lng"] = gps.location.lng();
    doc["alt"] = gps.altitude.meters();
    doc["speed"] = gps.speed.kmph();
    doc["course"] = gps.course.deg();
    doc["satellites"] = gps.satellites.value();
    doc["hdop"] = gps.hdop.hdop();
  } else {
    doc["status"] = "invalid";
    doc["busId"] = busId;
    doc["satellites"] = gps.satellites.value();
    doc["message"] = "No GPS signal";
  }
  
  String jsonString;
  serializeJson(doc, jsonString);
  return jsonString;
}

// Function to get basic GPS data as string (backward compatibility)
String getGPSData() {
  String data = "";
  
  if (gps.location.isValid()) {
    data += "Bus:" + busId;
    data += ",Lat:" + String(gps.location.lat(), 6);
    data += ",Lng:" + String(gps.location.lng(), 6);
    data += ",Alt:" + String(gps.altitude.meters()) + "m";
    data += ",Spd:" + String(gps.speed.kmph()) + "km/h";
    data += ",Sat:" + String(gps.satellites.value());
    data += ",HDOP:" + String(gps.hdop.hdop());
  } else {
    data = "Bus:" + busId + ",Status:No GPS signal,Sat:" + String(gps.satellites.value());
  }
  
  return data;
}

// Utility function to print system status
void printSystemStatus() {
  Serial.println("\n=== SYSTEM STATUS ===");
  Serial.println("Bus ID: " + busId);
  Serial.println("WiFi: " + String(WiFi.status() == WL_CONNECTED ? "Connected" : "Disconnected"));
  Serial.println("GPS: " + String(gps.location.isValid() ? "Valid" : "Invalid"));
  Serial.println("Satellites: " + String(gps.satellites.value()));
  Serial.println("Uptime: " + String(millis() / 1000) + "s");
  Serial.println("Free Heap: " + String(ESP.getFreeHeap()) + " bytes");
  Serial.println("=====================\n");
}
